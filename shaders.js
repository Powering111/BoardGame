class Shader {
    constructor(vert, frag){
        this.vert = vert;
        this.frag = frag;
    }
}

const shader1 = new Shader(`#version 300 es
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
`, `#version 300 es
precision highp float;
precision highp int;

in vec2 coord;
out vec4 color;

void main()
{
    color = vec4(coord*0.4, 0.8, 0.5);
}
`);

const shader2 = new Shader(`#version 300 es
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
}`, `#version 300 es
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
}`);