/**
 * Creates and compiles a shader.
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string} shaderSource The GLSL source code for the shader.
 * @param {number} shaderType The type of shader, VERTEX_SHADER or
 *     FRAGMENT_SHADER.
 * @return {!WebGLShader} The shader.
 */
function compileShader(gl, shaderSource, shaderType) {
  // Create the shader object
  var shader = gl.createShader(shaderType);
 
  // Set the shader source code.
  gl.shaderSource(shader, shaderSource);
 
  // Compile the shader
  gl.compileShader(shader);
 
  // Check if it compiled
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    // Something went wrong during compilation; get the error
    throw ("could not compile shader:" + gl.getShaderInfoLog(shader));
  }
 
  return shader;
}

/**
 * Creates a program from 2 shaders.
 *
 * @param {!WebGLRenderingContext) gl The WebGL context.
 * @param {!WebGLShader} vertexShader A vertex shader.
 * @param {!WebGLShader} fragmentShader A fragment shader.
 * @return {!WebGLProgram} A program.
 */
function createProgram(gl, vertexShader, fragmentShader) {
  // create a program.
  var program = gl.createProgram();
 
  // attach the shaders.
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
 
  // link the program.
  gl.linkProgram(program);
 
  // Check if it linked.
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
      // something went wrong with the link; get the error
      throw ("program failed to link:" + gl.getProgramInfoLog(program));
  }
 
  return program;
};

const vert1 = `#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec2 pos;
layout(location = 1) in vec2 obj_pos;

const float scale = 0.85;
const float tilescale = 0.03125;

out vec2 coord;
void main()
{
    vec2 new_pos = obj_pos + pos*scale*tilescale + vec2(tilescale*0.5);
    vec2 real_pos = vec2((2.0*new_pos.x-1.0),(1.0-2.0*new_pos.y));
    gl_Position = vec4(real_pos, 0.0, 1.0);
    coord = (real_pos+1.0)*0.5;
}
`;
const frag1 = `#version 300 es
precision highp float;
precision highp int;

in vec2 coord;
out vec4 color;

void main()
{
    color = vec4(coord*0.4, 0.8, 0.5);
}
`;


const vert2 = `#version 300 es
precision highp float;
precision highp int;

const vec2 quadVertices[4] = vec2[4](vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0), vec2(1.0, 1.0));

out vec2 coord;

float norm(float f){
    return (f+1.0)/2.0;
}
void main()
{
    gl_Position = vec4(quadVertices[gl_VertexID], 0.0, 1.0);
    coord = vec2(norm(gl_Position.x), 1.0-norm(gl_Position.y));
}`;

const frag2 = `#version 300 es
precision highp float;
precision highp int;

in vec2 coord;
out vec4 color;

uniform vec2 mouse_pos;

void main()
{
    float dist = distance(coord, mouse_pos);
    float alpha = clamp((0.2-dist), 0.0, 1.0);
    color = vec4(1.0, 0.0, 0.0, alpha);
}`;


function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect(), // abs. size of element
        scaleX = canvas.width / rect.width / rect.width,    // relationship bitmap vs. element for x
        scaleY = canvas.height / rect.height / rect.height;  // relationship bitmap vs. element for y
    const x = (evt.clientX - rect.left) * scaleX;   // scale mouse coordinates after they have
    const y = (evt.clientY - rect.top) * scaleY;     // been adjusted to be relative to element

    return {x,y}
}

(function () {
    'use strict';

    const canvas = document.getElementById('a');

    /** @type {WebGL2RenderingContext} */
    const gl = canvas.getContext('webgl2', { antialias: false, depth: false });
    
    
    const isWebGL2 = !!gl;
    if(!isWebGL2) {
        document.writeln('WebGL 2 is not available.');
        return;
    }

    
    const vertexShader = compileShader(gl, vert1, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, frag1, gl.FRAGMENT_SHADER);
    
    const program = createProgram(gl, vertexShader, fragmentShader);

    const program2 = createProgram(gl, compileShader(gl, vert2, gl.VERTEX_SHADER), compileShader(gl, frag2, gl.FRAGMENT_SHADER));

    var vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);


    const TILE_SIZE=32;
    const tile = new Array(TILE_SIZE).fill(null).map(() => new Array(TILE_SIZE).fill(0));

    const object_pos = new Float32Array(2*TILE_SIZE*TILE_SIZE);
    for(let i=0;i<TILE_SIZE;i++){
        for(let j=0;j<TILE_SIZE;j++){
            const center_x = j*0.03125;
            const center_y = i*0.03125;

            // const offset = i*TILE_SIZE*8 + j*8;
            object_pos[(i*TILE_SIZE+j)*2] = center_x;
            object_pos[(i*TILE_SIZE+j)*2+1] = center_y;
        }
    }

    var vertice_pos = new Float32Array([
        -0.5, -0.5,
        -0.5, 0.5,
        0.5, 0.5,
        0.5, -0.5,
        -0.5, -0.5,
        0.5, 0.5,
    ]);




    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);


    const vertexPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertice_pos, gl.STATIC_DRAW);
    const pos_loc = gl.getAttribLocation(program, 'pos');
    gl.enableVertexAttribArray(pos_loc);
    gl.vertexAttribPointer(pos_loc, 2, gl.FLOAT, false, 0, 0);


    const objectPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objectPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, object_pos, gl.STATIC_DRAW);
    
    const obj_pos_loc = gl.getAttribLocation(program, 'obj_pos');

    gl.enableVertexAttribArray(obj_pos_loc);
    gl.vertexAttribPointer(obj_pos_loc, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(obj_pos_loc, 1);



    const mouse_pos_loc = gl.getUniformLocation(program2, "mouse_pos");

    let mousepos = {x:0.0, y:0.0};

    canvas.addEventListener('mousemove',(e)=>{
        const pos = getMousePos(canvas, e);
        mousepos.x = pos.x;
        mousepos.y = pos.y;
    });

    // render
    function render(){
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    
        // draw
        gl.useProgram(program2);
        gl.uniform2f(mouse_pos_loc, mousepos.x, mousepos.y)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
    

        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, TILE_SIZE*TILE_SIZE);

        requestAnimationFrame(render);
    }
    
    requestAnimationFrame(render);

    // cleanup
    // gl.deleteProgram(program);
    // gl.deleteVertexArray(vertexArray);

})();    
