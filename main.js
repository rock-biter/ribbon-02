import './style.css'
import {
	Scene,
	WebGLRenderer,
	Mesh,
	BoxGeometry,
	MeshNormalMaterial,
	PerspectiveCamera,
	AmbientLight,
	Vector3,
	SpotLight,
	MeshStandardMaterial,
	SpotLightHelper,
} from 'three'
import { createNoise2D, createNoise3D } from 'simplex-noise'
// const noise = createNoise2D()
const noise = createNoise3D()
console.log(noise)

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const GLSL_SIMPLEX_NOISE = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}
`

const scene = new Scene()

const geometry = new BoxGeometry(20, 2, 0.1, 400, 200, 2)
const material = new MeshStandardMaterial({
	color: 0x452789,
	wireframe: false,
})

const uniforms = {
	uTime: { value: 0 },
}

material.onBeforeCompile = (shader) => {
	console.log(shader.uniforms)
	console.log(shader.vertexShader)

	shader.uniforms.uTime = uniforms.uTime
	shader.uniforms.uNoise = { value: noise }

	shader.vertexShader = shader.vertexShader.replace(
		'#include <common>',
		`
	  #include <common>
		${GLSL_SIMPLEX_NOISE}
	  uniform float uTime;
	  `
	)

	shader.vertexShader = shader.vertexShader.replace(
		'#include <project_vertex>',
		`
		vec4 mvPosition = vec4( transformed, 1.0 );

		#ifdef USE_INSTANCING

			mvPosition = instanceMatrix * mvPosition;

		#endif

		float distance = mvPosition.x ;
		float noise = snoise( (mvPosition.xyx + vec3(uTime * 0.003)) * vec3(0.25,0.1,0.25) ) * (0.4 + 0.1);

		mvPosition = modelMatrix * mvPosition;
		
		mvPosition.z += noise;
		mvPosition.y += snoise( (mvPosition.xyz + vec3(uTime * 0.001)) * 0.1);
		mvPosition.x -= distance * abs(noise) * 0.02 + distance * 0.08;

		mvPosition = viewMatrix * mvPosition;
		

		gl_Position = projectionMatrix * mvPosition;
    `
	)

	// console.log(vertexShader)
}

const flag = new Mesh(geometry, material)
flag.position.x = 0

for (let i = 0; i < 10; i++) {
	let clone = flag.clone()
	clone.position.z += (i - 5) * 1

	scene.add(clone)
}

// scene.add(flag)

const camera = new PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	1,
	50
)

camera.position.copy(new Vector3(-8, 6, 8))

const light = new AmbientLight(0xffffff, 1)
const spot = new SpotLight(0xffffff, 10, 50, Math.PI * 0.15, 1, 0.01)
spot.position.set(6, 4, 4)
spot.rotateX(Math.PI * -0.5)
spot.rotateY(Math.PI * 0.5)

const spotHelper = new SpotLightHelper(spot)
spotHelper.scale.set(0.01, 0.01, 0.01)

scene.add(light, spot)

const renderer = new WebGLRenderer()
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target = new Vector3(0, 3, 0)

function onResize() {
	camera.aspect = window.innerWidth / window.innerHeight
	renderer.setSize(window.innerWidth, window.innerHeight)
	camera.updateProjectionMatrix()
}

window.addEventListener('resize', onResize)

onResize()

function tic(t) {
	renderer.render(scene, camera)
	controls.update()

	// console.log(t)
	uniforms.uTime.value = t

	requestAnimationFrame(tic)
}

requestAnimationFrame(tic)
