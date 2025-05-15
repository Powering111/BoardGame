class Shader {
    constructor(vert, frag){
        this.vert = vert;
        this.frag = frag;
    }
}

// shader for grid
const shader_tile = new Shader(
`#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec2 pos;
layout(location = 1) in vec2 texture_pos;
layout(location = 2) in vec2 obj_pos;
layout(location = 3) in float a_hover;
layout(location = 4) in int a_state;

const float scale = 0.80;
const float tilescale = 0.0625;

out vec2 coord;
out vec2 texcoord;
flat out float hover;
flat out int state;

uniform int u_is_hover;

void main()
{
    float real_scale = scale;
    if(u_is_hover == 1){
        real_scale += a_hover*0.15;
    }
    vec2 new_pos = obj_pos + pos * real_scale * tilescale + vec2(tilescale*0.5);
    
    vec2 real_pos = vec2((2.0*new_pos.x-1.0),(1.0-2.0*new_pos.y));
    gl_Position = vec4(real_pos, 0.0, 1.0);
    coord = (real_pos+1.0)*0.5;
    texcoord = texture_pos;
    hover = a_hover;
    state = a_state;
}
`,
`#version 300 es
precision highp float;
precision highp int;

in vec2 coord;
in vec2 texcoord;
flat in float hover;
flat in int state;

uniform sampler2D u_texture;
uniform int u_curr_state;

out vec4 color;

void main()
{
    vec4 base_color = vec4(0.12, 0.11, 0.27, 1.0);
    vec4 hover_color = vec4(1.0,1.0,0.7,1.0);

    if(state == u_curr_state){
        color = texture(u_texture, texcoord);
    }
    else{
        color = vec4(0.0);
    }
}`);

const shader_outline = new Shader(
`#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec2 pos;
layout(location = 2) in vec2 obj_pos;
layout(location = 5) in int a_outline;

out vec2 coord;
flat out int outline;

const float scale = 0.88;
const float tilescale = 0.0625;

float norm(float f){
    return (f+1.0)/2.0;
}
void main()
{
    float real_scale = scale;
    if(a_outline != 0) {
        real_scale = 1.0;
    }

    vec2 new_pos = obj_pos + pos*real_scale*tilescale + vec2(tilescale*0.5);
    vec2 real_pos = vec2((2.0*new_pos.x-1.0),(1.0-2.0*new_pos.y));
    gl_Position = vec4(real_pos, 0.0, 1.0);
    coord = vec2(norm(gl_Position.x), 1.0-norm(gl_Position.y));
    outline = a_outline;
}
`,
`#version 300 es
precision highp float;
precision highp int;

in vec2 coord;
flat in int outline;
out vec4 color;

uniform vec2 u_mouse_pos;
uniform int u_is_hover;
float range = 0.1;
void main()
{
    if(outline == 1){
        // over cause
        color = vec4(1.0, 0.4, 0.4, 1.0);
    }
    else if(outline == 2){
        // cursor here
        color = vec4(0.7, 0.2, 0.9, 1.0);
    }
    else if(u_is_hover == 0){
        color = vec4(0.0, 0.0, 0.0, 0.0);
    }
    else{
        float dist = distance(coord, u_mouse_pos);
        float alpha = clamp((range-dist)/range, 0.0, 1.0);
        color = vec4(1.0, 1.0, 1.0, alpha);
    }
}
`);