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

const TILE_SIZE=16;


class Index{
    constructor(r,c){
        this.r = r;
        this.c = c;
    }
}

function randInt(max) {
  return Math.floor(Math.random() * max);
}

function sample(size, cnt){
    const sampler = new Array(size).fill(null).map((_, index, array) => index);
    const res = [];
    let left = size;
    while(cnt>0){
        const curr_idx = randInt(left);
        const curr = sampler[curr_idx];
        
        
        res.push(curr);
        
        sampler[curr_idx] = sampler[left-1];
        
        cnt--;
        left--;
    }
    return res;
}

const VELOCITY = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
class Game{
    constructor(){
        /** @type {Tile[][]} */
        this.tiles = Array.from({length: TILE_SIZE}, _ =>
            Array.from({length:TILE_SIZE}, _ => new Tile())
        );

        // select mines
        sample(TILE_SIZE * TILE_SIZE, 30).forEach(
            (index) => {
                const curr_r = Math.floor(index/TILE_SIZE);
                const curr_c = index%TILE_SIZE;
                this.tiles[curr_r][curr_c].mine = true;
                console.log(curr_r, curr_c);
            }
        );

        this.over = false;
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
        return new Float32Array(TILE_SIZE*TILE_SIZE).map((value, index, array)=>{
            const r = Math.floor(index/TILE_SIZE);
            const c = index%TILE_SIZE;
            return this.tiles[r][c].hover;
        });
    }

    // tile states for render
    get_tile_state(){
        return new Int32Array(TILE_SIZE*TILE_SIZE).map((value, index, array)=>{
            const r = Math.floor(index/TILE_SIZE);
            const c = index%TILE_SIZE;
            return this.tiles[r][c].state;
        });
    }

    valid_index(index){
        return index.r>=0 && index.c>=0 && index.r<TILE_SIZE && index.c<TILE_SIZE;
    }

    adjacent_mines(index){
        return VELOCITY.reduce((acc, vel) => {
            const nr = index.r + vel[0];
            const nc = index.c + vel[1];
            if(this.valid_index(new Index(nr,nc)) && this.tiles[nr][nc].mine){
                return acc+1;
            }
            else {
                return acc;
            }
        }, 0);
    }

    reveal_number(index){
        const curr = this.tiles[index.r][index.c];
        if(curr.state != State.HIDDEN) return;
        
        const reveal_cnt = this.adjacent_mines(index);
        curr.state = reveal_cnt;

        if(reveal_cnt==0){
            VELOCITY.forEach((vel)=>{
                const new_index = new Index(index.r + vel[0], index.c + vel[1]);
                if(this.valid_index(new_index)){
                    this.reveal_number(new_index);
                }
            });
        }
    }

    // user left clicks
    reveal(index){
        const curr = this.tiles[index.r][index.c];
        if(this.over || curr.state!=State.HIDDEN) return;
        if(curr.mine){
            console.log("game over! It was mine!");
            curr.state = State.MINE;
            this.over = true;
        }
        else{
            // reveal
            this.reveal_number(index);
        }
    }

    // user right clicks
    flag(index){
        const curr = this.tiles[index.r][index.c];
        if(this.over || curr.state!=State.HIDDEN) return;
        if(curr.mine){
            curr.state = State.FLAG;
        }
        else{
            const reveal_cnt = this.adjacent_mines(index);
            this.tiles[index.r][index.c].state = reveal_cnt;
            console.log("game over! It was not mine!");
            this.over = true;
        }
    }
}