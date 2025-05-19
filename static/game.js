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
        scaleX = 1.0 / rect.width,
        scaleY = 1.0 / rect.height;
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

const State = Object.freeze({
    ZERO : 0,
    ONE : 1,
    TWO : 2,
    THREE : 3,
    FOUR : 4,
    FIVE : 5,
    SIX : 6,
    SEVEN : 7,
    EIGHT : 8,
    MINE : 9,
    FLAG : 10,
    HIDDEN : 11,
});

const TILE_SIZE=16;

class Index{
    constructor(r,c){
        this.r = r;
        this.c = c;
    }
    
    is_valid(){
        return this.r>=0 && this.c>=0 && this.r<TILE_SIZE && this.c<TILE_SIZE;
    }
    
    serialize(){
        return this.r*TILE_SIZE + this.c
    }
    static unserialize(index){
        return new Index(
            Math.floor(index/TILE_SIZE),
            index%TILE_SIZE
        );
    }
}


class Tile{
    constructor(){
        this.state=State.HIDDEN;
        this.hover=0.0;
        this.hovering = false;
        this.mine = false;
    }

    update(delta){
        if(this.hovering){
            // this.hover+=delta*0.01;
            this.hover=1.0;
        }
        else{
            this.hover-=delta*0.01;
        }
        this.hover = Math.min(1.0, Math.max(0.0, this.hover));
    }
}

class Board{
    /**
     * @param {WebGL2RenderingContext} canvas
     * @param {Array<HTMLImageElement>} images
     * @param {boolean} is_mine
     */
    constructor(gl, images, is_mine){
        this.tiles = Array.from({length: TILE_SIZE}, _ =>
            Array.from({length:TILE_SIZE}, _ => new Tile())
        );

        this.gl = gl;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.program_tile = createProgram(gl, shader_tile);
        this.program_outline = createProgram(gl, shader_outline);

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
        
        this.vao = gl.createVertexArray();
        
        gl.bindVertexArray(this.vao);
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


        this.hoverBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.hoverBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.get_tile_hover(), gl.DYNAMIC_DRAW);

        const hover_loc = gl.getAttribLocation(this.program_tile, 'a_hover');
        gl.enableVertexAttribArray(hover_loc);
        gl.vertexAttribPointer(hover_loc, 1, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(hover_loc, 1);


        this.stateBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.stateBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.get_tile_state(), gl.DYNAMIC_DRAW);
        const state_loc = gl.getAttribLocation(this.program_tile, 'a_state');
        gl.enableVertexAttribArray(state_loc);
        gl.vertexAttribIPointer(state_loc, 1, gl.INT, false, 0, 0);
        gl.vertexAttribDivisor(state_loc, 1);


        this.outlineBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.outlineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.get_tile_outline(), gl.DYNAMIC_DRAW);
        const outline_loc = gl.getAttribLocation(this.program_outline, 'a_outline');
        gl.enableVertexAttribArray(outline_loc);
        gl.vertexAttribIPointer(outline_loc, 1, gl.INT, false, 0, 0);
        gl.vertexAttribDivisor(outline_loc, 1);


        this.textures = images.map((img) => {
            if(img){
                const texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, img);
                gl.generateMipmap(gl.TEXTURE_2D);
                return texture;
            }
        });

        // uniform locations
        this.curr_state_loc = gl.getUniformLocation(this.program_tile, "u_curr_state");
        this.mouse_pos_loc = gl.getUniformLocation(this.program_outline, "u_mouse_pos");
        this.is_hover_loc1 = gl.getUniformLocation(this.program_tile, 'u_is_hover');
        this.is_hover_loc2 = gl.getUniformLocation(this.program_outline, 'u_is_hover');


        this.is_hover = false;
        this.mousepos = {x:0.0, y:0.0};
        
        const canvas = gl.canvas;
        canvas.addEventListener('mousemove',(e)=>{
            this.is_hover = true;
            this.mousepos = getMousePos(canvas, e);
        });
        canvas.addEventListener('mouseleave', (e)=> {
            this.is_hover = false;
        })

        this.over_cause = null;
        this.last_action = null;
    }
    
    update(delta){
        for(let i=0;i<TILE_SIZE;i++){
            for(let j=0;j<TILE_SIZE;j++){
                this.tiles[i][j].update(delta);
            }
        }
    }

    hover(index){
        for(let i=0;i<TILE_SIZE;i++){
            for(let j=0;j<TILE_SIZE;j++){
                this.tiles[i][j].hovering = false;
            }
        }
        this.tiles[index.r][index.c].hovering = true;
    }

    // tile hover for render
    get_tile_hover(){
        return new Float32Array(TILE_SIZE*TILE_SIZE).map((value, idx, array)=>{
            const index = Index.unserialize(idx);
            return this.tiles[index.r][index.c].hover;
        });
    }

    // tile states for render
    get_tile_state(){
        return new Int32Array(TILE_SIZE*TILE_SIZE).map((value, idx, array)=>{
            const index = Index.unserialize(idx);
            return this.tiles[index.r][index.c].state;
        });
    }

    get_tile_outline(){
        return new Int32Array(TILE_SIZE*TILE_SIZE).map((value, idx, array)=>{
            const index = Index.unserialize(idx);
            if(this.over_cause != null && this.over_cause.r == index.r && this.over_cause.c == index.c){
                return 1;
            }
            else if(this.last_action != null && this.last_action.r == index.r && this.last_action.c == index.c){
                return 2;
            }
            else{
                return 0;
            }
        });
    }

    draw(){
        const index = getHoverTile(this.mousepos.x, this.mousepos.y);
        if(index.is_valid()){
            this.hover(index);
        }
        
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        

        gl.bindBuffer(gl.ARRAY_BUFFER, this.hoverBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.get_tile_hover());

        gl.bindBuffer(gl.ARRAY_BUFFER, this.stateBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.get_tile_state());

        gl.bindBuffer(gl.ARRAY_BUFFER, this.outlineBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.get_tile_outline());

        // tile outline
        gl.useProgram(this.program_outline);
        gl.uniform1i(this.is_hover_loc2, this.is_hover);
        gl.uniform2f(this.mouse_pos_loc, this.mousepos.x, this.mousepos.y);

        gl.bindVertexArray(this.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, TILE_SIZE*TILE_SIZE);

        // tile foreground
        gl.useProgram(this.program_tile);
        // gl.bindVertexArray(vao);
        gl.uniform1i(this.is_hover_loc1, this.is_hover);

        for(let i=0;i<=State.HIDDEN;i++){
            gl.uniform1i(this.curr_state_loc, i);

            if(this.textures[i]){
                gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
            }
            else{
                gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
            }
            
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, TILE_SIZE*TILE_SIZE);
        }
    }
}

// Should be singleton
class Game{
    /**
     * @param {WebSocket} ws
     * @param {HTMLImageElement[]} images
     * @param {number} board virtual board number of current player
     */
    constructor(ws, images, board){
        this.ws = ws;
        /** @type {Tile[][]} */
        this.board = board;
        this.images = images;

        const canvas1 = document.getElementById('canvas1');
        const canvas2 = document.getElementById('canvas2');
        /** @type {WebGL2RenderingContext} */
        this.gl1 = canvas1.getContext('webgl2', { antialias: false, depth: false, premultipliedAlpha: false});
        this.gl2 = canvas2.getContext('webgl2', { antialias: false, depth: false, premultipliedAlpha: false});
        const isWebGL2 = !!this.gl1;
        if(!isWebGL2) {
            document.writeln('WebGL 2 is not available.');
        }

        this.reset();

        canvas1.addEventListener('mousedown', (e)=>{
            e.preventDefault();

            const pos = getMousePos(canvas1, e);

            const index = getHoverTile(pos.x, pos.y);
            if(e.button==0){
                this.reveal(index);
            }
            else if(e.button==2){
                this.flag(index);
            }
        });
    }

    reset(){
        this.over = false;
        this.board1 = new Board(this.gl1, this.images, true);
        this.board2 = new Board(this.gl2, this.images, false);
    }

    update_board(board1, board2){
        for (let i = 0; i < TILE_SIZE; i++){
            for (let j = 0; j < TILE_SIZE; j++){
                this.board1.tiles[i][j].state = parseInt(board1.state[i*TILE_SIZE+j], 16);
                this.board2.tiles[i][j].state = parseInt(board2.state[i*TILE_SIZE+j], 16);
            }
        }
        this.board1.over_cause = board1.over_cause;
        this.board2.over_cause = board2.over_cause;
        this.board1.last_action = board1.last_action;
        this.board2.last_action = board2.last_action;

        document.getElementById('mines_1').innerText = board1.mines_left;
        document.getElementById('mines_2').innerText = board2.mines_left;
    }

    finish(winner){
        this.over = true;
        if(winner == this.board){
            alert("You win!");
        }
        else{
            alert("You lose!");
        }
    }
    
    render(now){
        let deltaTime = 0.0;
        if(this.lastTime == null){
            this.lastTime = now;
        }
        else{
            deltaTime = now - this.lastTime;
            this.lastTime = now;
        }

        // draw
        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((now)=>{this.render(now)});
    }

    start(){
        // render
        this.lastTime = null;
        requestAnimationFrame((now)=>{this.render(now)});
    }

    update(deltaTime){
        this.board1.update(deltaTime);
        this.board2.update(deltaTime);
    }

    draw(){
        this.board1.draw();
        this.board2.draw();
    }

    // user left clicks
    reveal(index){
        const curr = this.board1.tiles[index.r][index.c];
        if(this.over || curr.state!=State.HIDDEN) return;
        
        this.ws.send(JSON.stringify({
            type: 'reveal',
            row: index.r,
            column: index.c
        }));
    }
    
    // user right clicks
    flag(index){
        const curr = this.board1.tiles[index.r][index.c];
        if(this.over || curr.state!=State.HIDDEN) return;
        
        this.ws.send(JSON.stringify({
            type: 'flag',
            row: index.r,
            column: index.c,
        }));
    }
}