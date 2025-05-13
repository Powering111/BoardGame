class Tile{
    constructor(){
        this.filled=null;
        this.hover=0.0;
        this.hovering = false;
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


const TILE_SIZE=16;


class Index{
    constructor(r,c){
        this.r = r;
        this.c = c;
    }
}

class Game{
    constructor(){
        /** @type {Tile[][]} */
        this.tiles = Array.from({length: TILE_SIZE}, _ =>
            Array.from({length:TILE_SIZE}, _ => new Tile())
        );
    }

    update(delta){
        for(let i=0;i<TILE_SIZE;i++){
            for(let j=0;j<TILE_SIZE;j++){
                this.tiles[i][j].update(delta);
            }
        }
    }

    /**
     * 
     * @param {Index} index 
     */
    hover(index){
        for(let i=0;i<TILE_SIZE;i++){
            for(let j=0;j<TILE_SIZE;j++){
                this.tiles[i][j].hovering = false;
            }
        }
        this.tiles[index.r][index.c].hovering = true;
    }

    get_tile_hover(){
        return new Float32Array(TILE_SIZE*TILE_SIZE).map((value, index, array)=>{
            const r = Math.floor(index/TILE_SIZE);
            const c = index%TILE_SIZE;
            return this.tiles[r][c].hover;
        });
    }
}