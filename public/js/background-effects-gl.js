'use strict';

/**
 * WebGL2 camera background compositor for the worker engine (background-effects-worker.js).
 * DOM-free: renders into an OffscreenCanvas. After the approach of Google Meet and
 * volcomix/virtual-background (MIT):
 *   1. Joint bilateral filter: upsamples the low-resolution person mask guided by the camera frame,
 *      so the mask edges follow the real edges of the person instead of a blurry blob.
 *   2. Background: cover-fitted image, or the camera frame blurred with the person masked out,
 *      so the blur has no person-colored halo.
 *   3. Light wrapping: the background's light bleeds into the person's outer edge (screen blend), so
 *      the person looks lit by the new scene instead of cut out.
 * Returns null from createCompositor() when WebGL2 is unavailable: the caller keeps the Canvas2D path.
 */
(function (root) {
    const DEFAULTS = Object.freeze({
        // Bilateral filter, in mask texels: kernel radius, sample step and spatial sigma
        radius: 2,
        step: 0.5,
        sigmaSpace: 1,
        // Color distance (RGB 0..1) at which a neighbour stops counting as the same surface
        sigmaColor: 0.1,
        // The refined mask is computed at most this wide, then sampled bilinearly
        maxRefineWidth: 640,
        // Mask values mapped to fully transparent / fully opaque person
        coverage: [0.4, 0.8],
        lightWrapping: 0.3,
        // The blur runs at this fraction of the frame size
        blurScale: 0.25,
    });

    const MODE = Object.freeze({ image: 0, blur: 1 });

    const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
uniform bool u_flipY;
out vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    if (u_flipY) v_uv.y = 1.0 - v_uv.y;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const BILATERAL_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_frame;
uniform sampler2D u_mask;
uniform vec2 u_maskTexel;
uniform float u_radius;
uniform float u_step;
uniform float u_sigmaSpace;
uniform float u_sigmaColor;
in vec2 v_uv;
out vec4 outColor;
void main() {
    vec3 center = texture(u_frame, v_uv).rgb;
    float spaceCoeff = -0.5 / (u_sigmaSpace * u_sigmaSpace);
    float colorCoeff = -0.5 / (u_sigmaColor * u_sigmaColor);
    float sum = 0.0;
    float total = 0.0;
    for (float y = -u_radius; y <= u_radius + 0.001; y += u_step) {
        for (float x = -u_radius; x <= u_radius + 0.001; x += u_step) {
            vec2 uv = v_uv + vec2(x, y) * u_maskTexel;
            vec3 delta = texture(u_frame, uv).rgb - center;
            float weight = exp((x * x + y * y) * spaceCoeff + dot(delta, delta) * colorCoeff);
            sum += weight * texture(u_mask, uv).a;
            total += weight;
        }
    }
    outColor = vec4(sum / total);
}`;

    // Downsample the frame for the blur, weighted by "is background" so the person does not bleed in
    const MASKED_DOWNSAMPLE_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_frame;
uniform sampler2D u_mask;
uniform vec2 u_texel;
in vec2 v_uv;
out vec4 outColor;
void main() {
    vec4 sum = vec4(0.0);
    for (int i = 0; i < 4; i++) {
        vec2 uv = v_uv + vec2(float(i % 2) - 0.5, float(i / 2) - 0.5) * u_texel * 0.5;
        float weight = 1.0 - texture(u_mask, uv).r;
        sum += vec4(texture(u_frame, uv).rgb * weight, weight);
    }
    outColor = sum * 0.25;
}`;

    const GAUSSIAN_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform vec2 u_direction;
uniform float u_sigma;
uniform int u_radius;
in vec2 v_uv;
out vec4 outColor;
void main() {
    float coeff = -0.5 / (u_sigma * u_sigma);
    vec4 sum = vec4(0.0);
    float total = 0.0;
    for (int i = -u_radius; i <= u_radius; i++) {
        float weight = exp(float(i * i) * coeff);
        sum += texture(u_input, v_uv + float(i) * u_direction) * weight;
        total += weight;
    }
    outColor = sum / total;
}`;

    const COMPOSITE_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_frame;
uniform sampler2D u_mask;
uniform sampler2D u_background;
uniform int u_mode;
uniform vec4 u_backgroundTransform;
uniform vec2 u_coverage;
uniform float u_lightWrapping;
in vec2 v_uv;
out vec4 outColor;
void main() {
    vec3 frame = texture(u_frame, v_uv).rgb;
    float mask = texture(u_mask, v_uv).r;
    float alpha = smoothstep(u_coverage.x, u_coverage.y, mask);
    vec3 background;
    if (u_mode == 1) {
        vec4 blurred = texture(u_background, v_uv);
        background = clamp(blurred.rgb / max(blurred.a, 1e-4), 0.0, 1.0);
    } else {
        background = texture(u_background, v_uv * u_backgroundTransform.xy + u_backgroundTransform.zw).rgb;
    }
    float wrap = u_lightWrapping * (1.0 - clamp((mask - u_coverage.y) / (1.0 - u_coverage.y), 0.0, 1.0));
    vec3 lit = 1.0 - (1.0 - frame) * (1.0 - wrap * background);
    outColor = vec4(mix(background, lit, alpha), 1.0);
}`;

    // UV scale / offset that fill the frame with the source without distorting it (CSS object-fit: cover)
    function coverTransform(sourceWidth, sourceHeight, width, height) {
        if (!sourceWidth || !sourceHeight || !width || !height) return [1, 1, 0, 0];
        const scale = Math.max(width / sourceWidth, height / sourceHeight);
        const scaleX = width / scale / sourceWidth;
        const scaleY = height / scale / sourceHeight;
        return [scaleX, scaleY, (1 - scaleX) / 2, (1 - scaleY) / 2];
    }

    function scaledSize(width, height, scale, maxWidth = Infinity) {
        const factor = Math.min(scale, maxWidth / width);
        return [Math.max(1, Math.round(width * factor)), Math.max(1, Math.round(height * factor))];
    }

    // Gaussian sigma (in blur texels) and tap radius for a CSS-like blur(px) radius at full frame size
    function blurKernel(blurRadius, blurScale) {
        const sigma = Math.max(0.5, blurRadius * blurScale);
        return { sigma, radius: Math.min(32, Math.ceil(sigma * 3)) };
    }

    function sourceSize(source) {
        return [
            source.displayWidth || source.naturalWidth || source.videoWidth || source.width || 0,
            source.displayHeight || source.naturalHeight || source.videoHeight || source.height || 0,
        ];
    }

    function createCompositor(canvas, options = {}) {
        const settings = { ...DEFAULTS, ...options };
        let gl;
        try {
            gl = canvas.getContext('webgl2', {
                // Blur and image backgrounds are always opaque
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
                preserveDrawingBuffer: true,
            });
        } catch (error) {
            gl = null;
        }
        if (!gl) return null;

        const state = { lost: false };
        canvas.addEventListener?.('webglcontextlost', (event) => {
            event.preventDefault?.();
            state.lost = true;
        });

        const floatTargets = Boolean(gl.getExtension('EXT_color_buffer_float'));

        function compile(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const log = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error(`Background shader failed to compile: ${log}`);
            }
            return shader;
        }

        const vertexShader = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
        function program(fragmentSource) {
            const handle = gl.createProgram();
            const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
            gl.attachShader(handle, vertexShader);
            gl.attachShader(handle, fragmentShader);
            gl.bindAttribLocation(handle, 0, 'a_position');
            gl.linkProgram(handle);
            gl.deleteShader(fragmentShader);
            if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) {
                throw new Error(`Background program failed to link: ${gl.getProgramInfoLog(handle)}`);
            }
            const uniforms = new Map();
            return {
                use() {
                    gl.useProgram(handle);
                    return this;
                },
                set(name, setter, ...values) {
                    if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(handle, name));
                    gl[setter](uniforms.get(name), ...values);
                    return this;
                },
                handle,
            };
        }

        const programs = {
            bilateral: program(BILATERAL_SHADER),
            downsample: program(MASKED_DOWNSAMPLE_SHADER),
            gaussian: program(GAUSSIAN_SHADER),
            composite: program(COMPOSITE_SHADER),
        };

        // One triangle covering the viewport
        const vertexArray = gl.createVertexArray();
        gl.bindVertexArray(vertexArray);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        function texture() {
            const handle = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, handle);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            return handle;
        }

        function target(float = false) {
            const handle = texture();
            const framebuffer = gl.createFramebuffer();
            const format = float && floatTargets ? gl.RGBA16F : gl.RGBA8;
            const type = float && floatTargets ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
            return {
                texture: handle,
                framebuffer,
                width: 0,
                height: 0,
                resize(width, height) {
                    if (this.width === width && this.height === height) return;
                    this.width = width;
                    this.height = height;
                    gl.bindTexture(gl.TEXTURE_2D, handle);
                    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, gl.RGBA, type, null);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, handle, 0);
                },
            };
        }

        const textures = { frame: texture(), mask: texture(), background: texture() };
        const targets = { refined: target(), blurA: target(true), blurB: target(true) };
        const mask = { image: null, dirty: false, width: 0, height: 0 };
        const background = { source: null, width: 0, height: 0 };

        function bind(unit, handle) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, handle);
        }

        function draw(active, output, flipY = false) {
            active.set('u_flipY', 'uniform1i', flipY ? 1 : 0);
            if (output) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, output.framebuffer);
                gl.viewport(0, 0, output.width, output.height);
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        function upload(handle, source) {
            gl.bindTexture(gl.TEXTURE_2D, handle);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        }

        function uploadMask() {
            if (!mask.dirty) return;
            upload(textures.mask, mask.image);
            mask.width = mask.image.width;
            mask.height = mask.image.height;
            mask.dirty = false;
        }

        function uploadBackground(source) {
            if (source === background.source) return;
            upload(textures.background, source);
            background.source = source;
            [background.width, background.height] = sourceSize(source);
        }

        function refine(width, height) {
            const [refineWidth, refineHeight] = scaledSize(width, height, 1, settings.maxRefineWidth);
            targets.refined.resize(refineWidth, refineHeight);
            programs.bilateral
                .use()
                .set('u_frame', 'uniform1i', 0)
                .set('u_mask', 'uniform1i', 1)
                .set('u_maskTexel', 'uniform2f', 1 / mask.width, 1 / mask.height)
                .set('u_radius', 'uniform1f', settings.radius)
                .set('u_step', 'uniform1f', settings.step)
                .set('u_sigmaSpace', 'uniform1f', settings.sigmaSpace)
                .set('u_sigmaColor', 'uniform1f', settings.sigmaColor);
            bind(0, textures.frame);
            bind(1, textures.mask);
            draw(programs.bilateral, targets.refined);
        }

        function blur(width, height, blurRadius) {
            const [blurWidth, blurHeight] = scaledSize(width, height, settings.blurScale);
            targets.blurA.resize(blurWidth, blurHeight);
            targets.blurB.resize(blurWidth, blurHeight);
            programs.downsample
                .use()
                .set('u_frame', 'uniform1i', 0)
                .set('u_mask', 'uniform1i', 1)
                .set('u_texel', 'uniform2f', 1 / blurWidth, 1 / blurHeight);
            bind(0, textures.frame);
            bind(1, targets.refined.texture);
            draw(programs.downsample, targets.blurA);

            const { sigma, radius } = blurKernel(blurRadius, settings.blurScale);
            programs.gaussian
                .use()
                .set('u_input', 'uniform1i', 0)
                .set('u_sigma', 'uniform1f', sigma)
                .set('u_radius', 'uniform1i', radius);
            programs.gaussian.set('u_direction', 'uniform2f', 1 / blurWidth, 0);
            bind(0, targets.blurA.texture);
            draw(programs.gaussian, targets.blurB);
            programs.gaussian.set('u_direction', 'uniform2f', 0, 1 / blurHeight);
            bind(0, targets.blurB.texture);
            draw(programs.gaussian, targets.blurA);
            return targets.blurA.texture;
        }

        return {
            canvas,
            settings,
            get lost() {
                return state.lost || gl.isContextLost();
            },
            // mask: ImageData (or any texture source) whose alpha is the person confidence
            setMask(image) {
                mask.image = image;
                mask.dirty = true;
            },
            // view: { kind: 'blur', blurRadius } | { kind: 'image', source }
            render(frame, width, height, view) {
                if (!mask.image) return false;
                if (view.kind === 'image' && !view.source) return false;
                if (canvas.width !== width || canvas.height !== height) {
                    canvas.width = width;
                    canvas.height = height;
                }
                upload(textures.frame, frame);
                uploadMask();
                refine(width, height);

                let backgroundTexture = textures.background;
                let transform = [1, 1, 0, 0];
                if (view.kind === 'blur') {
                    backgroundTexture = blur(width, height, view.blurRadius);
                } else {
                    uploadBackground(view.source);
                    transform = coverTransform(background.width, background.height, width, height);
                }

                programs.composite
                    .use()
                    .set('u_frame', 'uniform1i', 0)
                    .set('u_mask', 'uniform1i', 1)
                    .set('u_background', 'uniform1i', 2)
                    .set('u_mode', 'uniform1i', view.kind === 'blur' ? MODE.blur : MODE.image)
                    .set('u_backgroundTransform', 'uniform4f', ...transform)
                    .set('u_coverage', 'uniform2f', ...settings.coverage)
                    .set('u_lightWrapping', 'uniform1f', settings.lightWrapping);
                bind(0, textures.frame);
                bind(1, targets.refined.texture);
                bind(2, backgroundTexture);
                draw(programs.composite, null, true);
                return true;
            },
            destroy() {
                gl.getExtension('WEBGL_lose_context')?.loseContext();
            },
        };
    }

    root.BackgroundEffectsGL = Object.freeze({
        DEFAULTS,
        MODE,
        coverTransform,
        scaledSize,
        blurKernel,
        createCompositor,
    });
})(typeof globalThis !== 'undefined' ? globalThis : self);
