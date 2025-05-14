'use strict';

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
function linkShaders(gl, vertexShader, fragmentShader) {
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

/**
 * Creates a program from 2 shaders.
 *
 * @param {!WebGLRenderingContext) gl The WebGL context.
 * @param {!Shader} shader.
 * @return {!WebGLProgram} A program.
 */
function createProgram(gl, shader){
    const vertex_shader = compileShader(gl, shader.vert, gl.VERTEX_SHADER);
    const fragment_shader = compileShader(gl, shader.frag, gl.FRAGMENT_SHADER);

    return linkShaders(gl, vertex_shader, fragment_shader);
}


/**
 * Get mouse position relative to the canvas, {0:1,0:1}
 *
 * @param {!HTMLCanvasElement} canvas
 * @param evt event
 * @return mouse position {x, y}
 */
function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect(), // abs. size of element
        scaleX = canvas.width / rect.width / rect.width,    // relationship bitmap vs. element for x
        scaleY = canvas.height / rect.height / rect.height;  // relationship bitmap vs. element for y
    const x = (evt.clientX - rect.left) * scaleX;   // scale mouse coordinates after they have
    const y = (evt.clientY - rect.top) * scaleY;     // been adjusted to be relative to element

    return {x,y}
}

/**
 * 
 * @param {int} x 
 * @param {int} y 
 * @returns {Index}
 */
function getHoverTile(x, y) {
    const divX = Math.floor(x * TILE_SIZE);
    const divY = Math.floor(y * TILE_SIZE);
    
    return new Index(divY,divX);
}




window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});




const game = new Game();



(async function () {

    const canvas = document.getElementById('a');

    /** @type {WebGL2RenderingContext} */
    const gl = canvas.getContext('webgl2', { antialias: false, depth: false, premultipliedAlpha: false});
    
    
    const isWebGL2 = !!gl;
    if(!isWebGL2) {
        document.writeln('WebGL 2 is not available.');
        return;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const program_tile = createProgram(gl, shader_tile);
    const program_outline = createProgram(gl, shader_outline);

    // Vertex data for rectangle.
    var vertice_pos = new Float32Array([
        -0.5, -0.5,
        -0.5, 0.5,
        0.5, 0.5,
        0.5, -0.5,
        -0.5, -0.5,
        0.5, 0.5,
    ]);
    var texture_pos = new Float32Array([
        0, 0,
        0, 1,
        1, 1,
        1, 0,
        0, 0,
        1, 1,
    ]);
    const object_pos = new Float32Array(2*TILE_SIZE*TILE_SIZE);
    for(let i=0;i<TILE_SIZE;i++){
        for(let j=0;j<TILE_SIZE;j++){
            const center_x = j*0.0625;
            const center_y = i*0.0625;

            // const offset = i*TILE_SIZE*8 + j*8;
            object_pos[(i*TILE_SIZE+j)*2] = center_x;
            object_pos[(i*TILE_SIZE+j)*2+1] = center_y;
        }
    }
    
    const vao = gl.createVertexArray();
    
    gl.bindVertexArray(vao);
    const vertexPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertice_pos, gl.STATIC_DRAW);
    const pos_loc = 0;
    gl.enableVertexAttribArray(pos_loc);
    gl.vertexAttribPointer(pos_loc, 2, gl.FLOAT, false, 0, 0);

    const texturePosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texturePosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texture_pos, gl.STATIC_DRAW);
    const texture_pos_loc = 1;
    gl.enableVertexAttribArray(texture_pos_loc);
    gl.vertexAttribPointer(texture_pos_loc, 2, gl.FLOAT, false, 0, 0);

    const objectPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objectPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, object_pos, gl.STATIC_DRAW);
    
    const obj_pos_loc = 2;
    gl.enableVertexAttribArray(obj_pos_loc);
    gl.vertexAttribPointer(obj_pos_loc, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(obj_pos_loc, 1);


    const hoverBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, hoverBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, game.get_tile_hover(), gl.DYNAMIC_DRAW);

    const hover_loc = gl.getAttribLocation(program_tile, 'a_hover');
    gl.enableVertexAttribArray(hover_loc);
    gl.vertexAttribPointer(hover_loc, 1, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(hover_loc, 1);


    const stateBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, stateBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, game.get_tile_state(), gl.DYNAMIC_DRAW);
    const state_loc = gl.getAttribLocation(program_tile, 'a_state');
    gl.enableVertexAttribArray(state_loc);
    gl.vertexAttribIPointer(state_loc, 1, gl.INT, false, 0, 0);
    gl.vertexAttribDivisor(state_loc, 1);


    // uniform locations
    const curr_state_loc = gl.getUniformLocation(program_tile, "curr_state");
    const mouse_pos_loc = gl.getUniformLocation(program_outline, "mouse_pos");
    let mousepos = {x:0.0, y:0.0};

    canvas.addEventListener('mousemove',(e)=>{
        const pos = getMousePos(canvas, e);
        mousepos.x = pos.x;
        mousepos.y = pos.y;
    });
    canvas.addEventListener('mousedown', (e)=>{
        e.preventDefault();

        const pos = getMousePos(canvas, e);
        mousepos.x = pos.x;
        mousepos.y = pos.y;

        const index = getHoverTile(pos.x, pos.y);
        if(e.button==0){
            game.reveal(index);
        }
        else if(e.button==2){
            game.flag(index);
        }
    });
    


    console.log("loading textures...")
    const sources = ['0','1','2','3','4','5','6','7','8','mine','flag','hidden'];
    const textures = await Promise.all(
        sources.map((_, index, array) => {
            return new Promise((resolve, reject)=>{
                if(!sources[index]) {
                    return resolve(null);
                }

                const img = new Image();
                img.addEventListener('load', () => {
                    // Now that the image has loaded make copy it to the texture.
                    const texture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, img);
                    gl.generateMipmap(gl.TEXTURE_2D);
                    resolve(texture);
                });
                img.addEventListener('error', ()=>{
                    console.log("error loading texture");
                    resolve(null);
                });
                
                img.src = `res/${sources[index]}.svg`
            })
        })
    );
    console.log("loading textures... done!");

    let lastTime;
    // render
    function render(now){
        let deltaTime = 0.0;
        if(!lastTime){
            lastTime = now;
        }
        else{
            deltaTime = now - lastTime;
            lastTime = now;
        }


        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    
        // draw
        const index = getHoverTile(mousepos.x, mousepos.y);

        game.hover(index);
        game.update(deltaTime);


        gl.bindBuffer(gl.ARRAY_BUFFER, hoverBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, game.get_tile_hover());

        gl.bindBuffer(gl.ARRAY_BUFFER, stateBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, game.get_tile_state());
        
        // tile outline
        gl.useProgram(program_outline);
        gl.uniform2f(mouse_pos_loc, mousepos.x, mousepos.y);

        gl.bindVertexArray(vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, TILE_SIZE*TILE_SIZE);

        // tile foreground
        gl.useProgram(program_tile);
        // gl.bindVertexArray(vao);

        for(let i=0;i<=State.HIDDEN;i++){
            gl.uniform1i(curr_state_loc, i);

            if(textures[i]){
                gl.bindTexture(gl.TEXTURE_2D, textures[i]);
            }
            else{
                gl.bindTexture(gl.TEXTURE_2D, textures[0]);
            }
            
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, TILE_SIZE*TILE_SIZE);
        }

        requestAnimationFrame(render);
    }
    
    requestAnimationFrame(render);

    // cleanup
    // gl.deleteProgram(program);
    // gl.deleteVertexArray(vertexArray);

})();    
