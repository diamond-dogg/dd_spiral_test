const canvas = document.getElementById('myCanvas');
const renderer = new THREE.WebGLRenderer({ canvas });

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const scene = new THREE.Scene();
const plane = new THREE.PlaneBufferGeometry(2, 2);
const fragmentShader = `
    uniform vec2 iResolution;
    uniform float iTime;

    float GLOBAL_SPEED = 1.0;

    float FREQ = 30.0;
    float BASE_SPEED = 5.0;

    float NOISE_FREQ = 6.0;
    float NOISE_SPEED = -0.2;
    float NOISE_AMP = 2.0;

    float PULSE_FREQ = 10.6;
    float PULSE_SPEED = 1.5;
    float PULSE_EXP = 2.0;
    float PULSE_AMP = 2.0;
	
	int SUPERSAMPLING_FACTOR = 4; // Supersampling factor for anti-aliasing (higher = smoother but slower)

    float rand(vec2 n) {
        return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
    }

    float noise(vec2 n) {
        const vec2 d = vec2(0.0, 1.0);
        vec2 b = floor(n), f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
        return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
    }

    vec2 c2p(vec2 p){
        float angle = atan(p.y, p.x);
        float radius = length(p);
        return vec2(radius, angle);
    }

    vec2 p2c(vec2 polar){
        float x = polar.x * cos(polar.y);
        float y = polar.x * sin(polar.y);
        return vec2(x, y);
    }

    vec3 primaryShader( in vec2 fragCoord ) {
        float globalTime = iTime * GLOBAL_SPEED;
        vec2 p = vec2((fragCoord.x / iResolution.x - 0.5) * (iResolution.x / min(iResolution.x, iResolution.y)) * 2.0,
                      (fragCoord.y / iResolution.y - 0.5) * (iResolution.y / min(iResolution.x, iResolution.y)) * 2.0);
        vec2 polar = c2p(p);
        vec2 noiseSampleP = p2c(vec2(polar.x, polar.y + globalTime * NOISE_SPEED));
        vec2 displace = vec2(noise(noiseSampleP * NOISE_FREQ));
        polar.y += polar.x * FREQ + globalTime * BASE_SPEED;
        float pulse = sin(polar.x * PULSE_FREQ + globalTime * PULSE_SPEED);
        polar.y -= pow(pulse, PULSE_EXP) * PULSE_AMP;
        polar.y += (atan(p.y, p.x) - pulse * 5.0) * 5.0;
        p = p2c(polar);
        float bright = 1.0 - abs(p.y);
        bright += abs(p.x) * -0.2;
        bright *= 1.8;
        bright *= pow(clamp(p.x, 0.0, 0.5), 0.5);
        bright = pow(bright, 5.0);
        bright = clamp(bright, 0.0, 1.0);

        vec3 col = mix(vec3(0.2, 0.0, 1.0), vec3(0.9, 0.8, 1), bright);
        col *= bright;

        return col;
    }
	
	vec3 superSample( in vec2 fragCoord ) {
		vec3 result = vec3(0.0);
		for (int x = 0; x < SUPERSAMPLING_FACTOR; x++) {
			for (int y = 0; y < SUPERSAMPLING_FACTOR; y++) {
				vec2 offset = vec2(float(x) / float(SUPERSAMPLING_FACTOR), float(y) / float(SUPERSAMPLING_FACTOR));
				result += primaryShader(fragCoord + offset) / float(SUPERSAMPLING_FACTOR*SUPERSAMPLING_FACTOR);
			}
		}
		return result;
	}

    void main() {
        vec2 fragCoord = gl_FragCoord.xy;
        vec3 result = superSample(fragCoord);
        gl_FragColor = vec4(result, 1.0);
    }
`;

const uniforms = {
    iResolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
    iTime: { value: 0 },
};

const material = new THREE.ShaderMaterial({
    uniforms,
    fragmentShader,
    vertexShader: `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = vec4( position, 1.0 );
        }
    `,
});

const mesh = new THREE.Mesh(plane, material);
scene.add(mesh);

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
        uniforms.iResolution.value.set(width, height);
    }
    return needResize;
}

function render(time) {
    time *= 0.001;
    uniforms.iTime.value = time;

    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}
requestAnimationFrame(render);
