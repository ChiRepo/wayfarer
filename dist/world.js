import * as T from "./vendor/three.module.js";
import { clamp, damp, lerp, TERRAIN_OFFSETS } from "./physics.js?v=20261021c";
const rand = (n) => {
  const r = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return r - Math.floor(r);
};
const colors = {
  alpine: { grass: 0x62734c, tree: 0x4d7245, rock: 0x777b71 },
  coast: { grass: 0x8e9860, tree: 0x5e784e, rock: 0x999483 },
  desert: { grass: 0xb18c62, tree: 0x677358, rock: 0xbd8059 },
};
const dummy = new T.Object3D(),
  color = new T.Color();
function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new T.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}
function texture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d"),
    img = ctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 180 + Math.random() * 65;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(3, 24);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
function labelTexture(text, bg = "#ede4ce", fg = "#263b32", width = 256, height = 128) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = fg;
  ctx.font = `600 ${height * 0.36}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);
  return new T.CanvasTexture(c);
}
export class World {
  constructor(canvas, road) {
    this.road = road;
    this.chunks = new Map();
    this.remoteCars = new Map();
    this.weather = "golden";
    this.mode = "chase";
    this.home = true;
    this.photo = false;
    this.orbit = 0.55;
    this.orbitHeight = 0.32;
    this.orbitDistance = 9;
    this.look = new T.Vector3();
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.wetness = 0;
    this.rainAmount = 0;
    this.wind = 0.3;
    this.renderScale = 1;
    this.performanceTime = 0;
    this.slowTime = 0;
    this.fastTime = 0;
    this.tempColor = new T.Color();
    this.time = 0;
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.scene = new T.Scene();
    this.scene.fog = new T.FogExp2(0xc4ccbb, 0.0016);
    this.camera = new T.PerspectiveCamera(53, innerWidth / innerHeight, 0.1, 3000);
    this.ambient = new T.HemisphereLight(0xd7e4de, 0x73754c, 2.15);
    this.scene.add(this.ambient);
    this.sunlight = new T.DirectionalLight(0xffdeb1, 3.5);
    this.sunlight.castShadow = true;
    this.sunlight.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sunlight.shadow.camera, {
      left: -45,
      right: 45,
      top: 45,
      bottom: -45,
      near: 10,
      far: 300,
    });
    this.sunlight.shadow.bias = -0.0007;
    this.sunlight.shadow.normalBias = 0.05;
    this.scene.add(this.sunlight, this.sunlight.target);
    this.sky = mesh(
      new T.SphereGeometry(2000, 32, 20),
      new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new T.Color(0x508b9b) },
          bottom: { value: new T.Color(0xf2d4a4) },
          sun: { value: new T.Vector3(-0.55, 0.23, -0.8).normalize() },
          time: { value: 0 },
          cloudCover: { value: 0.55 },
          sunPower: { value: 1 },
        },
        vertexShader:
          "varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: `varying vec3 vDirection;uniform vec3 top;uniform vec3 bottom;uniform vec3 sun;uniform float time;uniform float cloudCover;uniform float sunPower;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float f=0.,a=.5;for(int i=0;i<5;i++){f+=a*noise(p);p=p*2.03+vec2(19.1);a*=.5;}return f;}
void main(){vec3 d=normalize(vDirection);float h=pow(max(d.y,0.),.55);vec3 c=mix(bottom,top,clamp(h*1.65,0.,1.));vec2 cp=d.xz/(max(d.y,0.)+.2)*2.+vec2(time*.002,0.);float clouds=smoothstep(.64-cloudCover*.23,.88-cloudCover*.18,fbm(cp))*smoothstep(.03,.18,d.y);c=mix(c,mix(bottom,vec3(.85),.65),clouds*(.35+cloudCover*.5));float dist=distance(d,sun);c+=vec3(1.,.56,.22)*pow(max(0.,1.-dist),16.)*.45*sunPower;c=mix(c,vec3(1.,.87,.57),(1.-smoothstep(.018,.025,dist))*sunPower);gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
      }),
    );
    this.scene.add(this.sky);
    const asphalt = texture();
    this.materials = {
      road: new T.MeshStandardMaterial({ color: 0x48504e, roughness: 0.94, map: asphalt }),
      edge: new T.MeshStandardMaterial({ color: 0xe6dfc6, roughness: 1 }),
      center: new T.MeshStandardMaterial({ color: 0xdcc787, roughness: 1 }),
      terrain: new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
      bark: new T.MeshStandardMaterial({ color: 0x524b3b, roughness: 1 }),
      foliage: new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }),
      rock: new T.MeshStandardMaterial({
        color: colors.alpine.rock,
        roughness: 1,
        flatShading: true,
      }),
      rail: new T.MeshStandardMaterial({ color: 0xb6b9a8, metalness: 0.5, roughness: 0.5 }),
      post: new T.MeshStandardMaterial({ color: 0xede8d6, roughness: 1 }),
    };
    this.foliageWind = { time: { value: 0 }, strength: { value: 0.1 } };
    this.materials.foliage.onBeforeCompile = shader => {
      shader.uniforms.swayTime = this.foliageWind.time;
      shader.uniforms.swayStrength = this.foliageWind.strength;
      shader.vertexShader = "uniform float swayTime; uniform float swayStrength;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
        #ifdef USE_INSTANCING
        transformed.x += sin(swayTime + instanceMatrix[3].x * .07 + instanceMatrix[3].z * .04) * swayStrength * max(position.y + 1.5, 0.) * .08;
        #endif`);
    };
    // One small facade atlas is shared by every streamed settlement.
    const facade = document.createElement('canvas'); facade.width=64; facade.height=128;
    const fc=facade.getContext('2d'); fc.fillStyle='#d5ccba'; fc.fillRect(0,0,64,128);
    for(let y=8;y<128;y+=24) for(let x=8;x<64;x+=24) {
      fc.fillStyle=(x+y)%3 ? '#435965' : '#e3bd78'; fc.fillRect(x,y,12,15);
      fc.fillStyle='#b3a58d'; fc.fillRect(x-2,y+15,16,3);
    }
    this.materials.building = new T.MeshStandardMaterial({map:new T.CanvasTexture(facade),roughness:.9});
    this.materials.roof = new T.MeshStandardMaterial({color:0x79574b,roughness:1});
    this.materials.curb = new T.MeshStandardMaterial({color:0xffffff,roughness:1});
    this.geometries = {
      building: new T.BoxGeometry(1,1,1),
      roof: new T.ConeGeometry(.75,.55,4),
      pine: pineGeometry(),
      trunk: new T.CylinderGeometry(0.08, 0.13, 1, 5),
      rock: new T.IcosahedronGeometry(1, 1),
      post: new T.BoxGeometry(0.14, 0.9, 0.13),
      rail: new T.BoxGeometry(0.09, 0.18, 4.1),
      grass: grassGeometry(),
    };
    this.water = mesh(
      new T.PlaneGeometry(6000, 6000, 1, 1),
      new T.ShaderMaterial({
        transparent: true,
        uniforms: {
          time: { value: 0 },
          tint: { value: new T.Color(0x619b95) },
          fogColor: { value: this.scene.fog.color },
        },
        vertexShader:
          "varying vec3 p;void main(){p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}",
        fragmentShader:
          "varying vec3 p;uniform float time;uniform vec3 tint;uniform vec3 fogColor;void main(){float r=sin(p.x*.22+time*.7+sin(p.z*.08))*sin(p.z*.39-time*.6);float waves=pow(max(r,0.),12.);vec3 c=tint+waves*.13;float f=1.-exp(-length(p.xz-cameraPosition.xz)*.0018);gl_FragColor=vec4(mix(c,fogColor,f),.97);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
      }),
      0,
      0,
      0,
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.visible = false;
    this.scene.add(this.water);
    this.mountains = new T.Group();
    this.scene.add(this.mountains);
    this.buildMountains();
    this.buildCar();
    this.buildParticles();
    this.setWeather("golden");
    this.updateChunks(0);
    this.resize = () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
      this.applyResolution();
    };
    window.addEventListener("resize", this.resize);
  }
  buildMountains() {
    while (this.mountains.children.length) {
      const m = this.mountains.children[0];
      this.mountains.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    const biome = this.road.biome;
    for (let i = 0; i < 24; i++) {
      const side = i % 2 ? 1 : -1;
      if (biome === "coast" && side > 0) continue;
      const height = (biome === "desert" ? 130 : 280) + rand(i + this.road.seed) * 250;
      const g = new T.ConeGeometry(240 + rand(i + 80) * 260, height, 20, 14);
      const pos = g.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const x = pos.getX(j),
          z = pos.getZ(j),
          y = pos.getY(j);
        const wave =
          Math.sin(Math.atan2(z, x) * 7 + i) * 0.18 + Math.sin(y * 0.06 + x * 0.04) * 0.07;
        pos.setXYZ(
          j,
          x * (1 + wave),
          y + Math.sin(x * 0.017 + z * 0.027) * 18 * (0.5 - y / height),
          z * (1 + wave),
        );
      }
      g.computeVertexNormals();
      const col = [];
      const c = new T.Color();
      for (let j = 0; j < pos.count; j++) {
        const h = pos.getY(j) / height;
        if (
          biome === "alpine" &&
          h > 0.15 + Math.sin(pos.getX(j) * 0.035 + pos.getZ(j) * 0.031) * 0.065
        )
          c.set(0xdbddcf);
        else
          c.set(biome === "desert" ? 0xa78672 : 0x80908a).multiplyScalar(0.83 + rand(j + i) * 0.2);
        col.push(c.r, c.g, c.b);
      }
      g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
      const m = mesh(
        g,
        new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }),
        side * (480 + rand(i + 5) * 600),
        height * 0.38 - 35,
        -i * 190 + 300,
      );
      this.mountains.add(m);
    }
  }
  ribbon(start, length, left, right, material, lift = 0) {
    const p = [],
      uv = [],
      indices = [],
      steps = 40;
    for (let i = 0; i <= steps; i++) {
      const s = start + (i * length) / steps;
      for (const d of [left, right]) {
        p.push(this.road.center(s) + d, this.road.elevation(s) + lift, -s);
        uv.push(d * 0.1, i / steps);
      }
    }
    for (let i = 0; i < steps; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    const m = mesh(g, material);
    m.receiveShadow = true;
    return m;
  }
  createChunk(index) {
    const group = new T.Group();
    group.userData.obstacles = [];
    const start = index * 160,
      road = this.road,
      biome = road.biome,
      palette = colors[biome];
    const positions = [],
      cols = [],
      inds = [],
      offsets = TERRAIN_OFFSETS,
      rows = 40;
    let c = new T.Color();
    for (let i = 0; i <= rows; i++) {
      const s = start + i * 4;
      for (let j = 0; j < offsets.length; j++) {
        const d = offsets[j],
          x = road.center(s) + d,
          y = road.terrainVertex(x, s);
        positions.push(x, y, -s);
        c.set(palette.grass);
        const detail = rand(Math.floor(x * 0.8) + Math.floor(s * 0.8) * 0.1);
        c.multiplyScalar(0.83 + detail * 0.22);
        if (Math.abs(d) > 40 && biome === "alpine")
          c.lerp(new T.Color(palette.rock), clamp((y - road.elevation(s) - 15) / 40, 0, 0.9));
        if (Math.abs(d) < 7) c.set(biome === "desert" ? 0xb9a183 : 0x969477);
        if (biome === "coast" && d > 12) c.set(0xc6bda0);
        cols.push(c.r, c.g, c.b);
      }
    }
    const stride = offsets.length;
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < stride - 1; j++) {
        const a = i * stride + j;
        inds.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
      }
    closeGround(positions, cols, inds, stride, rows);
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new T.Float32BufferAttribute(cols, 3));
    geo.setIndex(inds);
    geo.computeVertexNormals();
    const terrain = mesh(geo, this.materials.terrain);
    terrain.receiveShadow = true;
    group.add(terrain);
    group.add(this.ribbon(start, 160, -5.1, 5.1, this.materials.road, 0.015));
    for (const side of [-1, 1])
      group.add(
        this.ribbon(start, 160, side * 4.65 - 0.06, side * 4.65 + 0.06, this.materials.edge, 0.032),
      );
    if (!road.circuit) for (let i = 0; i < 10; i++)
      group.add(this.ribbon(start + i * 16, 7, -0.065, 0.065, this.materials.center, 0.035));
    if (road.circuit) {
      const curbs=new T.InstancedMesh(this.geometries.building,this.materials.curb,80);
      for(let i=0;i<80;i++) {
        const s=start+Math.floor(i/2)*4+2, side=i%2 ? -1 : 1;
        dummy.position.set(road.center(s)+side*4.95,road.elevation(s)+.04,-s);
        dummy.rotation.set(0,-road.heading(s),0);dummy.scale.set(.4,.06,4.15);dummy.updateMatrix();
        curbs.setMatrixAt(i,dummy.matrix);curbs.setColorAt(i,color.set(Math.floor(i/2)%2 ? 0xe8e1d0 : 0xbb493f));
      }
      group.add(curbs);
    }
    const trees = biome === "desert" ? 12 : 75;
    const foliage = new T.InstancedMesh(this.geometries.pine, this.materials.foliage, trees * 3),
      trunks = new T.InstancedMesh(this.geometries.trunk, this.materials.bark, trees);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    trunks.castShadow = true;
    for (let i = 0; i < trees; i++) {
      const n = index * 1000 + i * 9 + road.seed * 3;
      const s = start + rand(n) * 160,
        side = rand(n + 1) > 0.5 ? 1 : -1;
      let d = side * (9 + Math.pow(rand(n + 2), 1.8) * 130);
      if (((index%12)+12)%12<=3 && Math.abs(d)<65) d=Math.sign(d)*(65+Math.abs(d));
      if (biome === "coast") d = -Math.abs(d);
      const x = road.center(s) + d,
        y = road.terrain(x, s),
        size = (0.7 + rand(n + 3) * 1.6) * (biome === "desert" ? 0.5 : 1);
      dummy.position.set(x, y + size * 1.4, -s);
      dummy.rotation.set(0, rand(n + 4) * 6.28, 0);
      dummy.scale.set(size * 1.3, size * 2.8, size * 1.3);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      for (let k = 0; k < 3; k++) {
        dummy.position.set(x, y + size * (2.7 + k * 1.4), -s);
        dummy.scale.set(size * (1.45 - k * 0.3), size * (1.3 - k * 0.1), size * (1.45 - k * 0.3));
        dummy.updateMatrix();
        foliage.setMatrixAt(i * 3 + k, dummy.matrix);
        color.set(palette.tree).multiplyScalar(0.8 + rand(n + 5) * 0.5);
        foliage.setColorAt(i * 3 + k, color);
      }
    }
    group.add(foliage, trunks);
    for (let i = 0; i < trees; i++) {
      trunks.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      group.userData.obstacles.push({
        x: dummy.position.x,
        z: dummy.position.z,
        r: Math.max(0.15, dummy.scale.x * 0.11),
      });
    }

    const tufts = biome === "desert" ? 100 : 430,
      grasses = new T.InstancedMesh(this.geometries.grass, this.materials.terrain, tufts);
    grasses.receiveShadow = true;
    for (let i = 0; i < tufts; i++) {
      const n = index * 2700 + i * 3.1,
        ss = start + rand(n) * 160,
        d = (rand(n + 1) > 0.5 ? 1 : -1) * (6.2 + Math.pow(rand(n + 2), 2) * 33);
      if (biome === "coast" && d > 22) {
        dummy.scale.set(0, 0, 0);
      } else {
        const size = 0.35 + rand(n + 3) * 0.7;
        dummy.scale.set(size, size, size);
      }
      dummy.position.set(road.center(ss) + d, road.terrain(road.center(ss) + d, ss), -ss);
      dummy.rotation.set(0, rand(n + 4) * 6.28, 0);
      dummy.updateMatrix();
      grasses.setMatrixAt(i, dummy.matrix);
      color.set(biome === "desert" ? 0xbfb17d : 0x7e8850).multiplyScalar(0.8 + rand(n + 5) * 0.5);
      grasses.setColorAt(i, color);
    }
    group.add(grasses);
    const rocks = new T.InstancedMesh(this.geometries.rock, this.materials.rock, 35);
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    for (let i = 0; i < 35; i++) {
      const n = index * 700 + i * 4;
      const s = start + rand(n) * 160,
        side = rand(n + 1) > 0.5 ? 1 : -1,
        d = side * (7 + rand(n + 2) * 90);
      let x = road.center(s) + d;
      if (biome === "coast" && d > 20) x = road.center(s) - d;
      const size = 0.4 + rand(n + 3) * (biome === "desert" ? 5 : 2.6);
      dummy.position.set(x, road.terrain(x, s) + size * 0.3, -s);
      dummy.scale.set(size * 1.2, size * 0.7, size);
      dummy.rotation.set(rand(n), rand(n + 2) * 4, rand(n + 1));
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    }
    group.add(rocks);
    for (let i = 0; i < 35; i++) {
      rocks.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      group.userData.obstacles.push({
        x: dummy.position.x,
        z: dummy.position.z,
        r: dummy.scale.x * 0.72,
      });
    }
    const posts = new T.InstancedMesh(this.geometries.post, this.materials.post, 16);
    const markers = new T.InstancedMesh(
      new T.BoxGeometry(0.155, 0.11, 0.15),
      new T.MeshStandardMaterial({ color: 0xefc47d, emissive: 0xc78924, emissiveIntensity: 0.25 }),
      16,
    );
    for (let i = 0; i < 16; i++) {
      const s = start + Math.floor(i / 2) * 20,
        side = i % 2 ? 1 : -1;
      dummy.position.set(road.center(s) + side * 5.7, road.elevation(s) + 0.4, -s);
      dummy.rotation.set(0, -road.heading(s), 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);
      group.userData.obstacles.push({ x: dummy.position.x, z: -s, r: 0.09 });
      dummy.position.y += 0.23;
      dummy.updateMatrix();
      markers.setMatrixAt(i, dummy.matrix);
    }
    group.add(posts, markers);
    if (biome === "coast" || Math.abs(road.curvature(start + 80)) > 0.0018) {
      const rails = new T.InstancedMesh(this.geometries.rail, this.materials.rail, 40);
      for (let i = 0; i < 40; i++) {
        const s = start + i * 4 + 2;
        dummy.position.set(road.center(s) + 5.8, road.elevation(s) + 0.58, -s);
        dummy.rotation.set(0, -road.heading(s), 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        rails.setMatrixAt(i, dummy.matrix);
      }
      group.add(rails);
    }
    if (index % 3 === 0) {
      const s = start + 90;
      const sign = new T.Group();
      const board = mesh(
        new T.BoxGeometry(1.25, 0.72, 0.08),
        new T.MeshStandardMaterial({
          map: labelTexture(
            biome === "alpine" ? "PASS ↑" : biome === "coast" ? "COAST ↑" : "SCENIC ↑",
            "#36594c",
            "#f1e8cf",
            256,
            128,
          ),
        }),
        0,
        1.75,
        0,
      );
      sign.add(
        board,
        mesh(new T.CylinderGeometry(0.035, 0.035, 1.7, 6), this.materials.rail, 0, 0.8, 0),
      );
      sign.position.set(road.center(s) + 7, road.elevation(s), -s);
      sign.rotation.y = -road.heading(s);
      group.add(sign);
      group.userData.obstacles.push({ x: road.center(s) + 7, z: -s, r: 0.12 });
    }
    const district = ((index % 12)+12)%12;
    if (district <= 3) {
      const city = district >= 2, count = city ? 24 : 10;
      const houses = new T.InstancedMesh(this.geometries.building,this.materials.building,count);
      const roofs = new T.InstancedMesh(this.geometries.roof,this.materials.roof,city ? 0 : count);
      houses.castShadow=true; houses.receiveShadow=true;
      for(let i=0;i<count;i++) {
        const s=start+12+(i%Math.ceil(count/2))*130/Math.ceil(count/2);
        const side=biome==='coast' ? -1 : i%2 ? -1 : 1;
        const x=road.center(s)+side*(city ? 28+(i%3)*14 : 22+(i%3)*9);
        const h=city ? 12+rand(i+index*39)*27 : 3.4+rand(i+index*39)*2.3;
        const width=city ? 8 : 6, depth=city ? 9 : 6;
        const ground=road.terrain(x,s);
        dummy.position.set(x,ground+h/2-1,-s); dummy.rotation.set(0,0,0); dummy.scale.set(width,h+2,depth); dummy.updateMatrix();
        houses.setMatrixAt(i,dummy.matrix);
        color.setHSL(.08+rand(i+index)*.08,.12,.6+rand(i)*.3); houses.setColorAt(i,color);
        if(!city) { dummy.position.y=ground+h+.7; dummy.scale.set(width,3,depth); dummy.rotation.y=Math.PI/4; dummy.updateMatrix(); roofs.setMatrixAt(i,dummy.matrix); }
        group.userData.obstacles.push({x,z:-s,r:width*.58});
      }
      group.add(houses,roofs);
    }
    this.scene.add(group);
    this.chunks.set(index, group);
  }
  disposeChunk(g) {
    this.scene.remove(g);
    g.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
      if (o.isMesh) {
        if (!Object.values(this.geometries).includes(o.geometry)) o.geometry.dispose();
        if (!Object.values(this.materials).includes(o.material)) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      }
    });
  }
  updateChunks(s) {
    const current = Math.floor(s / 160);
    for (const [i, g] of this.chunks)
      if (i < current - 2 || i > current + 9) {
        this.disposeChunk(g);
        this.chunks.delete(i);
      }
    // Collision-critical neighbours are immediate; distant scenery streams one
    // chunk per frame to avoid rebuilding a whole horizon during camera motion.
    for (let i=current-1;i<=current+1;i++) if(!this.chunks.has(i)) this.createChunk(i);
    for (let i=current-2;i<=current+9;i++) if(!this.chunks.has(i)) { this.createChunk(i); break; }
  }
  resolveCollisions(v) {
    let hit = false;
    const chunk = Math.floor(-v.z / 160);
    if (Math.abs(v.x - this.road.center(-v.z)) > 3) {
      for (let j = chunk - 1; j <= chunk + 1; j++) {
        const obstacles = this.chunks.get(j)?.userData.obstacles || [];
        for (const o of obstacles)
          if (Math.abs(v.z - o.z) < o.r + 4 && Math.abs(v.x - o.x) < o.r + 4)
            hit = v.collideObstacle(o.x, o.z, o.r) || hit;
      }
    }
    // Sample the continuous rail around both bumpers; no gaps between visible segments.
    for (const along of [-1.3, 0, 1.3]) {
      const ss = -v.z + Math.cos(v.heading) * along;
      const ci = Math.floor(ss / 160);
      const rail = this.road.biome === "coast" || Math.abs(this.road.curvature(ci * 160 + 80)) > 0.0018;
      if (rail && Math.abs(v.x - this.road.center(ss) - 5.8) < 4)
        hit = v.collideObstacle(this.road.center(ss) + 5.8, -ss, 0.07) || hit;
    }
    const offset = v.x - this.road.center(-v.z);
    if (Math.abs(offset) > 235) {
      v.x = this.road.center(-v.z) + Math.sign(offset) * 235;
      v.u *= 0.98; v.v *= 0.8;
    }
    if (hit) v.updateSuspension(0);
    return hit;
  }
  setRoad(road) {
    for (const g of this.chunks.values()) this.disposeChunk(g);
    this.chunks.clear();
    this.road = road;
    this.materials.foliage.color.set(0xffffff);
    this.materials.rock.color.set(colors[road.biome].rock);
    this.water.visible = road.biome === "coast";
    this.buildMountains();
    this.updateChunks(0);
    this.initialized = false;
  }
  bodyGeometry(sections) {
    const vertices = [],
      indices = [];
    for (const [z, w, b, t] of sections) {
      const bevel = Math.min(0.1, (t - b) * 0.25);
      vertices.push(
        -w * 0.9,
        b,
        z,
        w * 0.9,
        b,
        z,
        w,
        b + bevel,
        z,
        w,
        t - bevel,
        z,
        w * 0.9,
        t,
        z,
        -w * 0.9,
        t,
        z,
        -w,
        t - bevel,
        z,
        -w,
        b + bevel,
        z,
      );
    }
    for (let i = 0; i < sections.length - 1; i++)
      for (let k = 0; k < 8; k++) {
        const a = i * 8 + k,
          b = i * 8 + ((k + 1) % 8);
        indices.push(a, b, a + 8, b, b + 8, a + 8);
      }
    for (let k = 1; k < 7; k++) indices.push(0, k + 1, k);
    const e = vertices.length / 3 - 8;
    for (let k = 1; k < 7; k++) indices.push(e, e + k, e + k + 1);
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }
  buildCar() {
    this.car = new T.Group();
    this.body = new T.Group();
    this.car.add(this.body);
    this.scene.add(this.car);
    this.paint = new T.MeshPhysicalMaterial({
      color: 0xefb46e,
      metalness: 0.15,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
    });
    const glass = new T.MeshPhysicalMaterial({
      color: 0x344e54,
      metalness: 0.15,
      roughness: 0.14,
      clearcoat: 1,
    });
    const black = new T.MeshStandardMaterial({ color: 0x151e20, roughness: 0.7 });
    const chrome = new T.MeshStandardMaterial({ color: 0xc5c7be, metalness: 0.9, roughness: 0.25 });
    const shell = mesh(
      this.bodyGeometry([
        [-2.23, 0.76, -0.22, -0.01],
        [-2.1, 0.91, -0.29, 0.1],
        [-1.55, 0.98, -0.32, 0.2],
        [-0.7, 0.93, -0.3, 0.23],
        [0.75, 0.95, -0.3, 0.24],
        [1.45, 1, -0.31, 0.23],
        [1.97, 0.94, -0.29, 0.16],
        [2.2, 0.8, -0.2, 0.08],
      ]),
      this.paint,
    );
    this.body.add(shell);
    const cabin = mesh(
      this.bodyGeometry([
        [-0.93, 0.75, 0.18, 0.2],
        [-0.4, 0.68, 0.2, 0.79],
        [0.57, 0.68, 0.2, 0.81],
        [1.23, 0.77, 0.18, 0.21],
      ]),
      glass,
    );
    this.body.add(cabin);
    const roof = mesh(new T.BoxGeometry(1.22, 0.055, 0.97), this.paint, 0, 0.835, 0.08);
    this.body.add(roof);
    // Rigid sport-touring silhouette: skirts, splitter and a supported rear wing.
    this.body.add(mesh(new T.BoxGeometry(1.9,.07,.4),black,0,-.26,-2.18));
    this.body.add(mesh(new T.BoxGeometry(1.9,.08,.42),this.paint,0,.39,1.98));
    for(const side of [-1,1]) {
      this.body.add(mesh(new T.BoxGeometry(.08,.27,.12),black,side*.63,.24,1.98));
      this.body.add(mesh(new T.BoxGeometry(.12,.16,2.5),this.paint,side*.98,-.23,0));
      this.body.add(mesh(new T.BoxGeometry(.46,.045,.07),chrome,side*.57,.1,-2.22));
    }
    for (const side of [-1, 1]) {
      const pillar = mesh(
        new T.BoxGeometry(0.055, 0.77, 0.055),
        this.paint,
        side * 0.67,
        0.5,
        -0.66,
      );
      pillar.rotation.x = -0.71;
      this.body.add(pillar);
      const backPillar = mesh(
        new T.BoxGeometry(0.08, 0.88, 0.065),
        this.paint,
        side * 0.7,
        0.49,
        0.9,
      );
      backPillar.rotation.x = 0.77;
      this.body.add(backPillar);
      const middle = mesh(
        new T.BoxGeometry(0.045, 0.65, 0.045),
        this.paint,
        side * 0.675,
        0.49,
        0.35,
      );
      this.body.add(middle);
      this.body.add(
        mesh(new T.BoxGeometry(0.05, 0.045, 2.5), chrome, side * 0.94, -0.13, 0.1),
        mesh(new T.BoxGeometry(0.025, 0.07, 0.26), chrome, side * 0.96, 0.11, 0.5),
      );
      const mirror = mesh(new T.BoxGeometry(0.28, 0.13, 0.2), this.paint, side * 1.06, 0.34, -0.7);
      this.body.add(mirror);
    }
    this.body.add(
      mesh(new T.BoxGeometry(1.62, 0.13, 0.08), black, 0, -0.18, 2.2),
      mesh(new T.BoxGeometry(1.58, 0.14, 0.08), black, 0, -0.18, -2.21),
    );
    this.brakeMaterial = new T.MeshStandardMaterial({
      color: 0xe74735,
      emissive: 0xff3920,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    });
    this.body.add(mesh(new T.BoxGeometry(1.58, 0.057, 0.05), this.brakeMaterial, 0, 0.015, 2.2));
    const headMaterial = new T.MeshStandardMaterial({
      color: 0xffefd2,
      emissive: 0xffe5b6,
      emissiveIntensity: 2,
    });
    for (const side of [-1, 1]) {
      const h = mesh(
        new T.CylinderGeometry(0.13, 0.13, 0.05, 20),
        headMaterial,
        side * 0.58,
        -0.005,
        -2.2,
      );
      h.rotation.x = Math.PI / 2;
      this.body.add(h);
      this.body.add(mesh(new T.BoxGeometry(0.28, 0.025, 0.04), chrome, side * 0.6, 0.21, 1.72));
    }
    this.body.add(
      mesh(
        new T.BoxGeometry(0.55, 0.18, 0.045),
        new T.MeshStandardMaterial({
          map: labelTexture("WFR · 001", "#ebdebd", "#2b3530", 256, 64),
        }),
        0,
        -0.18,
        2.25,
      ),
    );
    this.wheels = [];
    const tyre = new T.MeshStandardMaterial({ color: 0x161b1a, roughness: 0.93 });
    for (const side of [-1, 1])
      for (const z of [-1.3, 1.3]) {
        const pivot = new T.Group();
        pivot.position.set(side * 0.94, -0.32, z);
        const spin = new T.Group();
        const tire = mesh(new T.CylinderGeometry(0.35, 0.35, 0.24, 24), tyre);
        tire.rotation.z = Math.PI / 2;
        spin.add(tire);
        const rim = mesh(new T.CylinderGeometry(0.235, 0.235, 0.251, 16), chrome);
        rim.rotation.z = Math.PI / 2;
        spin.add(rim);
        const cap = mesh(new T.CylinderGeometry(0.09, 0.09, 0.265, 16), black);
        cap.rotation.z = Math.PI / 2;
        spin.add(cap);
        for (let a = 0; a < 5; a++) {
          const spoke = mesh(new T.BoxGeometry(0.272, 0.037, 0.38), black);
          spoke.rotation.x = (a * Math.PI) / 5;
          spin.add(spoke);
        }
        pivot.add(spin);
        this.car.add(pivot);
        this.wheels.push({ pivot, spin, front: z < 0 });
      }
    this.reverseMaterial = new T.MeshStandardMaterial({ color: 0xf3eee0, emissive: 0xe8f4ff, emissiveIntensity: 0 });
    for (const side of [-1, 1]) this.body.add(mesh(new T.BoxGeometry(0.2, 0.06, 0.055), this.reverseMaterial, side * 0.69, -0.065, 2.21));
    this.headlights = [];
    for (const side of [-1, 1]) {
      const light = new T.SpotLight(0xffe7bb, 0, 80, 0.48, 0.7, 1);
      light.position.set(side * 0.65, 0.04, -2);
      const target = new T.Object3D();
      target.position.set(side * 2, -0.5, -35);
      this.car.add(light, target);
      light.target = target;
      this.headlights.push(light);
    }
    this.car.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext("2d"),
      gradient = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
    gradient.addColorStop(0, "rgba(0,0,0,.6)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    this.contactShadow = mesh(
      new T.PlaneGeometry(3.5, 6),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
      }),
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.contactShadow);
  }
  buildParticles() {
    const positions = new Float32Array(900 * 6);
    for (let i = 0; i < 900; i++) {
      const x = (rand(i) - 0.5) * 90,
        y = rand(i + 999) * 50,
        z = (rand(i + 45) - 0.5) * 90;
      positions.set([x, y, z, x - 0.25, y - 1.1, z + 0.1], i * 6);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(positions, 3));
    this.rain = new T.LineSegments(
      geo,
      new T.LineBasicMaterial({
        color: 0xd8e6e1,
        transparent: true,
        opacity: 0.33,
        depthWrite: false,
      }),
    );
    this.rain.visible = false;
    this.scene.add(this.rain);
    this.dustPositions = new Float32Array(70 * 3);
    this.dustAges = new Float32Array(70).fill(10);
    this.dustGeo = new T.BufferGeometry();
    this.dustGeo.setAttribute("position", new T.BufferAttribute(this.dustPositions, 3));
    this.dust = new T.Points(
      this.dustGeo,
      new T.PointsMaterial({
        color: 0xc2b798,
        size: 0.4,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    this.scene.add(this.dust);
    this.dustIndex = 0;
    const puff=document.createElement('canvas'); puff.width=puff.height=32;
    const pc=puff.getContext('2d'), gradient=pc.createRadialGradient(16,16,0,16,16,16);
    gradient.addColorStop(0,'rgba(255,255,255,.65)'); gradient.addColorStop(1,'rgba(255,255,255,0)');
    pc.fillStyle=gradient;pc.fillRect(0,0,32,32);
    this.dust.material.map=new T.CanvasTexture(puff);
    this.dust.material.size=.9;
    this.dust.frustumCulled=false;
    this.dustGeo.setAttribute('life',new T.BufferAttribute(new Float32Array(70),1));
    this.dust.material.onBeforeCompile=shader=>{
      shader.vertexShader='attribute float life; varying float fade;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('gl_PointSize = size;', 'fade=life; gl_PointSize = size * (2.0-life);');
      shader.fragmentShader='varying float fade;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= fade;\n#include <opaque_fragment>');
    };
  }
  setWeather(weather) {
    this.weather = weather;
    const presets = {
      golden: {
        top: 0x6298a3,
        bottom: 0xead4ad,
        fog: 0xbfc7b4,
        sun: 0xffdab0,
        power: 3.3,
        ambient: 2.1,
        exposure: 1.13,
        density: 0.0016,
      },
      day: {
        top: 0x458bbc,
        bottom: 0xcce0d7,
        fog: 0xb6d0c5,
        sun: 0xfff2d8,
        power: 3.5,
        ambient: 2.5,
        exposure: 1.05,
        density: 0.00135,
      },
      rain: {
        top: 0x405c6b,
        bottom: 0x95aaa8,
        fog: 0x91a5a1,
        sun: 0xc5d9e4,
        power: 0.8,
        ambient: 1.65,
        exposure: 0.95,
        density: 0.0035,
      },
      overcast: { top: 0x687f88, bottom: 0xc7d0c3, fog: 0xb0bdb0, sun: 0xdce9dc,
        power: 1.3, ambient: 2.2, exposure: 1.05, density: 0.0021 },
      mist: { top: 0x8eaaa9, bottom: 0xd8d9c5, fog: 0xb8cbc0, sun: 0xffe6bc,
        power: 1.1, ambient: 2.1, exposure: 1.08, density: 0.006 },
      night: {
        top: 0x111d3b,
        bottom: 0x887e94,
        fog: 0x4f6075,
        sun: 0xa0b9e9,
        power: 0.65,
        ambient: 0.85,
        exposure: 0.9,
        density: 0.002,
      },
    };
    this.targetWeather = presets[weather];
  }
  setQuality(q) {
    this.quality = q;
    this.renderScale = 1;
    this.applyResolution();
  }
  applyResolution() {
    const cap = this.quality === "high" ? 2 : this.quality === "low" ? 1 : 1.5;
    const budget = this.quality === "high" ? 4000000 : this.quality === "low" ? 1000000 : 2200000;
    const ratio = Math.min(devicePixelRatio || 1, cap, Math.sqrt(budget / Math.max(1, innerWidth * innerHeight))) * this.renderScale;
    this.renderer.setPixelRatio(Math.max(0.55, ratio));
    this.renderer.shadowMap.enabled = this.quality !== "low" && this.renderScale > 0.65;
    this.rain.geometry.setDrawRange(0, this.quality === "low" ? 450 : 1800);
  }
  adaptQuality(frameSeconds) {
    if (this.quality !== "balanced" || frameSeconds > 0.25) return;
    this.performanceTime += frameSeconds;
    if (this.performanceTime < 4) return;
    this.slowTime = frameSeconds > 1 / 38 ? this.slowTime + frameSeconds : Math.max(0, this.slowTime - frameSeconds * 0.3);
    this.fastTime = frameSeconds < 1 / 55 ? this.fastTime + frameSeconds : 0;
    if (this.slowTime > 3 && this.renderScale > 0.6) {
      this.renderScale = Math.max(0.6, this.renderScale - 0.1); this.slowTime = 0; this.applyResolution();
    } else if (this.fastTime > 15 && this.renderScale < 1) {
      this.renderScale = Math.min(1, this.renderScale + 0.05); this.fastTime = 0; this.applyResolution();
    }
  }
  update(v, dt, input) {
    this.time += dt;
    this.sky.material.uniforms.time.value = this.time;
    this.foliageWind.time.value = this.time * 0.6;
    this.foliageWind.strength.value = this.reducedMotion ? 0 : this.wind;
    this.sky.material.uniforms.cloudCover.value = damp(this.sky.material.uniforms.cloudCover.value,
      ["rain", "overcast", "mist"].includes(this.weather) ? 0.95 : 0.3 + (this.climateVariation || 0.5) * 0.3, 0.09, dt);
    this.sky.material.uniforms.sunPower.value = damp(this.sky.material.uniforms.sunPower.value,
      this.weather === "night" ? 0.08 : ["rain", "overcast", "mist"].includes(this.weather) ? 0.12 : 1, 0.09, dt);
    this.updateChunks(-v.z);
    const w = this.targetWeather,
      t = 1 - Math.exp(-dt * 0.09);
    this.sky.material.uniforms.top.value.lerp(this.tempColor.set(w.top), t);
    this.sky.material.uniforms.bottom.value.lerp(this.tempColor.set(w.bottom), t);
    this.scene.fog.color.lerp(this.tempColor.set(w.fog), t);
    this.scene.fog.density = lerp(this.scene.fog.density, w.density, t);
    this.sunlight.color.lerp(this.tempColor.set(w.sun), t);
    this.sunlight.intensity = damp(this.sunlight.intensity, w.power, 0.09, dt);
    this.ambient.intensity = damp(this.ambient.intensity, w.ambient, 0.09, dt);
    this.renderer.toneMappingExposure = damp(
      this.renderer.toneMappingExposure,
      w.exposure,
      0.09,
      dt,
    );
    this.car.position.set(v.x, v.y, v.z);
    this.car.rotation.y = -v.heading;
    this.body.rotation.x=damp(this.body.rotation.x,clamp(v.pitch,-.23,.23),12,dt);
    this.body.rotation.z=damp(this.body.rotation.z,clamp(v.roll,-.13,.13),12,dt);
    this.wheels.forEach((w, i) => {
      w.pivot.position.y = damp(w.pivot.position.y,clamp(v.wheels[i].height,-.55,-.12),20,dt);
      w.pivot.rotation.y = w.front ? -v.steer : 0;
      w.spin.rotation.x = -v.wheelSpin;
    });
    this.brakeMaterial.emissiveIntensity = (v.gear === 1 ? input.brake : input.throttle) || input.handbrake ? 4 : 0.9;
    this.reverseMaterial.emissiveIntensity = v.gear === -1 ? 2.5 : 0;
    this.materials.road.roughness = lerp(0.94, 0.32, this.wetness);
    this.headlights.forEach(l => l.intensity = damp(l.intensity, this.weather === "night" ? 65 : 28 * this.rainAmount + (this.weather === "mist" ? 20 : 0), 0.12, dt));
    this.contactShadow.position.set(v.x, this.road.surface(v.x, -v.z) + 0.025, v.z);
    this.contactShadow.rotation.z = v.heading;
    let targetPos = new T.Vector3(),
      look = new T.Vector3();
    this.cameraSpeed = damp(this.cameraSpeed || 0, Math.abs(v.u), 2.4, dt);
    this.cameraTurn = damp(this.cameraTurn || 0, clamp(v.yawRate, -0.5, 0.5), 3, dt);
    const pace = this.reducedMotion ? 0 : clamp(this.cameraSpeed / 45, 0, 1);
    const direction = v.gear === -1 ? -1 : 1;
    const forward = new T.Vector3(Math.sin(v.heading), 0, -Math.cos(v.heading)),
      right = new T.Vector3(Math.cos(v.heading), 0, Math.sin(v.heading));
    if (this.photo) {
      targetPos
        .copy(vPosition(v))
        .add(
          new T.Vector3(
            Math.sin(this.orbit) * this.orbitDistance,
            Math.max(1.2, this.orbitDistance * this.orbitHeight),
            Math.cos(this.orbit) * this.orbitDistance,
          ),
        );
      look.copy(vPosition(v));
    } else if (this.home) {
      targetPos.copy(vPosition(v)).addScaledVector(forward, -8).addScaledVector(right, -3.1);
      targetPos.y += 2.9;
      look.copy(vPosition(v)).addScaledVector(forward, 15);
      look.y += 0.5;
    } else if (this.mode === "hood" && direction === 1) {
      targetPos.copy(vPosition(v)).addScaledVector(forward, 1);
      targetPos.y += 0.76;
      look.copy(targetPos).addScaledVector(forward, 30);
      look.y -= 0.2;
    } else if (this.mode === "aerial") {
      targetPos.copy(vPosition(v)).addScaledVector(forward,-12).addScaledVector(right,8);
      targetPos.y+=23; look.copy(vPosition(v)).addScaledVector(forward,12);
    } else if (this.mode === "trackside") {
      const anchor=Math.floor(-v.z/100)*100+65;
      targetPos.set(this.road.center(anchor)+15,this.road.surface(this.road.center(anchor)+15,anchor)+3,-anchor);
      look.copy(vPosition(v));
    } else if (this.mode === "wide") {
      targetPos.copy(vPosition(v)).addScaledVector(forward, -15 * direction).addScaledVector(right, 5);
      targetPos.y += 7.2;
      look.copy(vPosition(v)).addScaledVector(forward, 10 * direction);
    } else {
      targetPos.copy(vPosition(v)).addScaledVector(forward, -(7.3 + pace * 1.8) * direction);
      targetPos.y += 2.7 - pace * 0.55;
      look.copy(vPosition(v)).addScaledVector(forward, (10 + pace * 9) * direction);
      if (!this.reducedMotion) look.addScaledVector(right, this.cameraTurn * 3);
      look.y += 0.25;
    }
    const minY = this.road.surface(targetPos.x, -targetPos.z) + 1.4;
    targetPos.y = Math.max(targetPos.y, minY);
    if (!this.initialized) {
      this.camera.position.copy(targetPos);
      this.look.copy(look);
      this.initialized = true;
    }
    const cameraState = this.photo ? "photo" : this.home ? "home" : this.mode;
    if (this.lastCameraState !== cameraState) { this.cameraBlend = 0; this.lastCameraState = cameraState; }
    this.cameraBlend = Math.min(1, (this.cameraBlend || 0) + dt / 1.2);
    const blend = this.cameraBlend * this.cameraBlend * (3 - 2 * this.cameraBlend);
    const smoothing = this.mode === "hood" && !this.home && !this.photo ? 4 + 16 * blend : 5;
    this.camera.position.lerp(targetPos, 1 - Math.exp(-dt * smoothing));
    this.look.lerp(look, 1 - Math.exp(-dt * 6));
    this.camera.position.y = Math.max(this.camera.position.y, this.road.surface(this.camera.position.x, -this.camera.position.z) + 0.7);
    this.camera.lookAt(this.look);
    this.camera.fov = damp(
      this.camera.fov,
      (innerWidth < innerHeight ? 10 : 0) + (this.photo ? 47 : this.home ? 53 : 53 + (this.reducedMotion ? 0 : pace * 12)),
      1.8,
      dt,
    );
    this.camera.updateProjectionMatrix();
    this.car.visible = true;
    this.sky.position.copy(this.camera.position);
    this.sunlight.position.set(v.x - 80, v.y + 80, v.z - 85);
    this.sunlight.target.position.set(v.x, v.y, v.z - 20);
    this.water.position.z = v.z;
    this.water.material.uniforms.time.value = this.time;
    this.mountains.position.z = v.z * 0.87;
    this.rain.position.copy(vPosition(v));
    this.rain.visible = this.rainAmount > 0.015;
    this.rain.material.opacity = this.rainAmount * 0.38;
    const rp = this.rain.geometry.attributes.position;
    if (this.rain.visible) for (let i = 0; i < rp.count; i += 2) {
      const y = (rand(i) * 50 - this.time * 22) % 50;
      rp.setX(i + 1, rp.getX(i) - 0.15 - this.wind * 0.9);
      rp.setY(i, y < 0 ? y + 50 : y);
      rp.setY(i + 1, (y < 0 ? y + 50 : y) - 1.1);
    }
    rp.needsUpdate = this.rain.visible;
    const smoking = v.drift > .15 && v.slip > .08 && v.u > 4 && v.wheels.some(w=>w.grounded);
    if ((smoking || v.offroad || this.wetness > 0.3) && Math.abs(v.u) > 3 && Math.random() < Math.min(1, dt * (this.quality === 'low' ? 20 : 45))) {
      const i = this.dustIndex++ % 70;
      const side=i%2 ? .92 : -.92;
      this.dustPositions.set([v.x+Math.cos(v.heading)*side-Math.sin(v.heading)*1.3,v.y-.3,v.z+Math.sin(v.heading)*side+Math.cos(v.heading)*1.3],i*3);
      this.dustAges[i] = 0;
    }
    for (let i = 0; i < 70; i++) {
      this.dustAges[i] += dt;
      this.dustGeo.attributes.life.setX(i,Math.max(0,1-this.dustAges[i]/2));
      if (this.dustAges[i] < 2) this.dustPositions[i * 3 + 1] += dt * 0.4;
      else this.dustPositions[i * 3 + 1] = -1000;
    }
    this.dust.material.color.set(smoking ? 0xe1e3e3 : this.wetness > 0.3 ? 0xc2d5d5 : 0xc2b798);
    this.dust.material.opacity = this.wetness > 0.3 ? 0.13 : 0.28;
    this.dustGeo.attributes.position.needsUpdate = true;
    this.dustGeo.attributes.life.needsUpdate = true;
    this.updatePeers(dt,v);
    this.renderer.render(this.scene, this.camera);
  }
  setPeers(peers) {
    const ids = new Set(peers.map(p => p.id));
    for (const [id, remote] of this.remoteCars) if (!ids.has(id)) {
      this.scene.remove(remote.car); remote.paint.dispose(); remote.brake.dispose(); remote.reverse.dispose();
      remote.label.material.map.dispose(); remote.label.material.dispose();
      this.remoteCars.delete(id);
    }
    for (const peer of peers) {
      let remote = this.remoteCars.get(peer.id);
      if (!remote) {
        const car = this.car.clone(true), paint = this.paint.clone(), brake = this.brakeMaterial.clone(), reverse = this.reverseMaterial.clone();
        car.traverse(o => {
          if (!o.isMesh) return;
          if (o.material === this.paint) o.material = paint;
          else if(o.material === this.brakeMaterial) o.material=brake;
          else if(o.material === this.reverseMaterial) o.material=reverse;
        });
        for (const child of [...car.children]) if (child.isLight) car.remove(child);
        const label = new T.Sprite(new T.SpriteMaterial({map:labelTexture(peer.name,'#143c32','#eee7ce',384,96),depthTest:false,depthWrite:false,toneMapped:false,transparent:true,opacity:0.85}));
        label.scale.set(3,.75,1); label.position.y=2.1; label.renderOrder=20; car.add(label);
        car.position.set(peer.x,peer.y,peer.z); car.rotation.y=-peer.h;
        remote={car,paint,brake,reverse,label,target:peer,received:performance.now()};
        this.scene.add(car); this.remoteCars.set(peer.id,remote);
      }
      remote.paint.color.set(peer.color);
      remote.brake.emissiveIntensity = peer.u * (peer.u - remote.target.u) < -0.2 ? 4 : 0.9;
      remote.reverse.emissiveIntensity = peer.u < -0.1 ? 2.5 : 0;
      remote.target=peer; remote.received=performance.now();
    }
  }
  updatePeers(dt, vehicle) {
    for (const remote of this.remoteCars.values()) {
      const p=remote.target, car=remote.car;
      car.visible=Math.hypot(p.x-vehicle.x,p.z-vehicle.z)<320;
      if (!car.visible) continue;
      const labelScale=clamp(Math.hypot(p.x-vehicle.x,p.z-vehicle.z)/16,1,6);
      remote.label.scale.set(3*labelScale,.75*labelScale,1);
      remote.label.visible=labelScale<6;
      const age=Math.min(.18,(performance.now()-remote.received)/1000), t=1-Math.exp(-dt*12);
      car.position.x=lerp(car.position.x,p.x+Math.sin(p.h)*p.u*age,t);
      car.position.y=lerp(car.position.y,p.y,t);
      car.position.z=lerp(car.position.z,p.z-Math.cos(p.h)*p.u*age,t);
      car.rotation.y+=Math.atan2(Math.sin(-p.h-car.rotation.y),Math.cos(-p.h-car.rotation.y))*t;
      car.children[0].rotation.set(p.p,0,p.r);
      for(let i=0;i<4;i++) {
        const pivot=car.children[i+1]; pivot.position.y=lerp(pivot.position.y,p['w'+i],t);
        pivot.rotation.y=i%2===0 ? -p.steer : 0;
        pivot.children[0].rotation.x=-(p.spin+p.u*age/.34);
      }
    }
  }
  photograph() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/png");
  }
}
function vPosition(v) {
  return new T.Vector3(v.x, v.y, v.z);
}

function pineGeometry() {
  const p = [],
    idx = [];
  const rings = 10,
    sides = 11;
  for (let r = 0; r <= rings; r++) {
    const y = -1.5 + (r / rings) * 3,
      base = (1 - r / rings) * 1.1;
    for (let a = 0; a < sides; a++) {
      const angle = (a / sides) * Math.PI * 2;
      const radius = base * (r % 2 === 0 ? 1 : 0.78) * (1 + Math.sin(a * 9 + r) * 0.13);
      p.push(Math.cos(angle) * radius, y + Math.sin(a * 7 + r) * 0.1, Math.sin(angle) * radius);
    }
  }
  for (let r = 0; r < rings; r++)
    for (let a = 0; a < sides; a++) {
      const i = r * sides + a,
        b = r * sides + ((a + 1) % sides);
      idx.push(i, i + sides, b, b, i + sides, b + sides);
    }
  const bottom = p.length / 3; p.push(0, -1.5, 0);
  const top = p.length / 3; p.push(0, 1.65, 0);
  for (let a = 0; a < sides; a++) {
    const b = (a + 1) % sides;
    idx.push(bottom, a, b, top, rings * sides + b, rings * sides + a);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function grassGeometry() {
  const p = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4,
      x = Math.cos(a) * 0.22,
      z = Math.sin(a) * 0.22,
      h = 0.45 + rand(i) * 0.55;
    p.push(x - 0.065, 0, z, x + 0.065, 0, z, x + 0.12, h, z + 0.1);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  g.setAttribute(
    "color",
    new T.Float32BufferAttribute(
      p.map(() => 1),
      3,
    ),
  );
  g.computeVertexNormals();
  return g;
}

// Closed ground volumes: the upper grid is shared with collision sampling.
export function closeGround(p, colors, indices, stride, rows) {
  const count = p.length / 3, top = [...indices];
  for (let i = 0; i < count; i++) { p.push(p[i * 3], -100, p[i * 3 + 2]); colors.push(...colors.slice(i * 3, i * 3 + 3)); }
  for (let i = 0; i < top.length; i += 3) indices.push(top[i] + count, top[i + 2] + count, top[i + 1] + count);
  const boundary = [];
  for (let j = 0; j < stride; j++) boundary.push(j);
  for (let i = 1; i <= rows; i++) boundary.push(i * stride + stride - 1);
  for (let j = stride - 2; j >= 0; j--) boundary.push(rows * stride + j);
  for (let i = rows - 1; i > 0; i--) boundary.push(i * stride);
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i], b = boundary[(i + 1) % boundary.length];
    indices.push(a, a + count, b, b, a + count, b + count);
  }
}
