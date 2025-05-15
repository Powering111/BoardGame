const TILE_SIZE=16;

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
        this.mine = false;
    }
}

const VELOCITY = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];

const INITIAL_MINES = 30;
class Board {
    constructor(){
        this.tiles = Array.from({length: TILE_SIZE}, _ =>
            Array.from({length:TILE_SIZE}, _ => new Tile())
        );
        
        // select mines
        this.mine_selected = false;
        this.mines_left = INITIAL_MINES;
        
        this.win = false;
        this.over = false;
        this.over_cause = null;

        this.last_action = null;
    }

    adjacent_mines(index){
        return VELOCITY.reduce((acc, vel) => {
            const nr = index.r + vel[0];
            const nc = index.c + vel[1];
            if(new Index(nr,nc).is_valid() && this.tiles[nr][nc].mine){
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
                if(new_index.is_valid()){
                    this.reveal_number(new_index);
                }
            });
        }
    }
    
    // select mine so that tile at zero_index have zero mines.
    select_mine(zero_index){
        const can_place_idx = [];
        for(let i=0;i<TILE_SIZE;i++){
            for(let j=0;j<TILE_SIZE;j++){
                const index = new Index(i,j);
                if(Math.abs(index.r - zero_index.r) > 1 || Math.abs(index.c - zero_index.c) > 1){
                    can_place_idx.push(index.serialize());
                }
            }
        }
        sample(can_place_idx.length, this.mines_left).forEach(
            (idx) => {
                const index = Index.unserialize(can_place_idx[idx]);
                this.tiles[index.r][index.c].mine = true;
            }
        );
        this.mine_selected = true;
    }

    // add mine to hidden, possible place and update adjacent tiles.
    // if it is not possible to add mine, then do nothing.
    add_mine(){
        if(!this.mine_selected){
            this.mines_left ++;
            return;
        }

        const can_place_idx = [];
        for(let i=0;i<TILE_SIZE;i++){
            for(let j=0;j<TILE_SIZE;j++){
                const index = new Index(i,j);
                if(!this.tiles[i][j].mine && this.tiles[i][j].state == State.HIDDEN){
                    can_place_idx.push(index.serialize());
                }
            }
        }

        if(can_place_idx.length == 0) return;
        const index = Index.unserialize(can_place_idx[randInt(can_place_idx.length)]);

        console.log("placing",index);
        this.tiles[index.r][index.c].mine = true;

        VELOCITY.forEach((vel) => {
            const next_index = new Index(index.r+vel[0], index.c+vel[1]);
            if(next_index.is_valid()){
                const next = this.tiles[next_index.r][next_index.c];
                if(!next.mine && next.state!=State.HIDDEN){
                    const reveal_cnt = this.adjacent_mines(next_index);
                    next.state = reveal_cnt;
                }
            }
        });

        this.mines_left ++;
    }

    reveal(index){
        if(!this.mine_selected){
            this.select_mine(index);
        }
        const curr = this.tiles[index.r][index.c];
        if(this.over || curr.state!=State.HIDDEN) return;
        this.last_action = index;
        if(curr.mine){
            curr.state = State.MINE;
            this.over = true;
            this.over_cause = index;
        }
        else{
            // reveal
            this.reveal_number(index);
        }
    }
    
    flag(index){
        if(!this.mine_selected){
            // you cannot flag before revealing at least one
            return false;
        }
        const curr = this.tiles[index.r][index.c];
        if(this.over || curr.state!=State.HIDDEN) return;
        this.last_action = index;
        if(curr.mine){
            curr.state = State.FLAG;
            this.mines_left --;
            if(this.mines_left==0){
                // win
                this.win = true;
            }
            return true;
        }
        else{
            const reveal_cnt = this.adjacent_mines(index);
            this.tiles[index.r][index.c].state = reveal_cnt;
            this.over = true;
            this.over_cause = index;
            return false;
        }
    }

    pack(){
        let state = "";
        for(let i=0;i<TILE_SIZE;i++){
            for(let j=0;j<TILE_SIZE;j++){
                state += this.tiles[i][j].state.toString(16);
            }
        }
        return {
            state: state,
            over_cause: (this.over_cause != null) ? {r: this.over_cause.r, c: this.over_cause.c} : null,
            mines_left: this.mines_left,
            last_action: (this.last_action != null) ? {r: this.last_action.r, c: this.last_action.c} : null,
        };
    }
}

class Game {
    /**
     * @param {WebSocket} ws1
     * @param {WebSocket} ws2
     * @param {int} deal_factor If nonzero, how many flags do you need to attack once. If zero, there is no attack.
     *  */
    constructor(ws1, ws2, deal_factor = 0){
        this.ws1 = ws1;
        this.ws2 = ws2;
        
        this.board1 = new Board();
        this.board2 = new Board();

        this.deal_factor = deal_factor;
        this.deal1 = 0;
        this.deal2 = 0;
    }

    check(){
        // they cannot win or over at the same time.
        if(this.board1.over){
            this.over = true;
            this.winner = 2;
        }
        else if(this.board2.over){
            this.over = true;
            this.winner = 1;
        }

        else if(this.board1.win){
            this.over = true;
            this.winner = 1;
        }
        else if(this.board2.win){
            this.over = true;
            this.winner = 2;
        }
    }


    reveal(board, index){
        if(this.over || !index.is_valid()) return;
        if(board==1){
            this.board1.reveal(index);
        }
        else if(board==2){
            this.board2.reveal(index);
        }
        this.check();
    }

    
    flag(board, index){
        if(this.over || !index.is_valid()) return;
        if(board==1){
            const res =this.board1.flag(index);
            if(res){
                this.deal1++;
                if(this.deal_factor!=0 && this.deal1>=this.deal_factor){
                    this.board2.add_mine();
                    this.deal1=0;
                }
            }
        }
        else if(board==2){
            const res = this.board2.flag(index);
            if(res){
                this.deal2++;
                if(this.deal_factor!=0 && this.deal2>=this.deal_factor){
                    this.board1.add_mine();
                    this.deal2=0;
                }
            }
        }
        this.check();
    }

    finish(winner){
        if(this.over) return;
        this.over = true;
        this.winner = winner;
    }
}

module.exports = {
    Index: Index,
    Game: Game,
}