exec(open(__import__('os').path.join(__import__('os').path.dirname(__file__),'rl.py')).read())
import numpy as np, os
from PIL import Image
OUT='out'
PAINT={'ecl':{'CarBaseCoat'},'sub':{'Car Paint.001'}}
RIM={'ecl':{'BrushedAluminium'},'sub':{'Rim.001'}}
STUDIO={'Plane.108','Plane.051','Plane.044','Plane.052','Plane.144','Plane.054','Plane.146'}
HIDE_NAMES={'MitsubishiLogo','EclipseLogo','Circle.005'}

def make_mask_mats():
    mats={}
    for n,c in [('red',(1,0,0,1)),('green',(0,1,0,1)),('black',(0,0,0,1))]:
        m=bpy.data.materials.new('MASK_'+n); m.use_nodes=True
        nt=m.node_tree; nt.nodes.clear()
        e=nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value=c; e.inputs['Strength'].default_value=1
        o=nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0],o.inputs[0]); mats[n]=m
    return mats

def isolate(sc,keep,floor_catch):
    for o in bpy.data.objects:
        if o.type=='MESH':
            if o in keep:
                o.hide_render=o.name in HIDE_NAMES
                if o.name in STUDIO: o.visible_camera=False
            else:
                o.hide_render=False
                o.visible_camera=False
    fl=bpy.data.objects['Garage Floor']
    if floor_catch:
        fl.visible_camera=True; fl.is_shadow_catcher=True

def render(path):
    sc=bpy.context.scene; sc.render.filepath=path; bpy.ops.render.render(write_still=True)

def proj_info(sc):
    cam=sc.camera
    f=lambda p:[world_to_camera_view(sc,cam,Vector(p)).x*W,(1-world_to_camera_view(sc,cam,Vector(p)).y)*H]
    o=f((0,0,0)); x=f((1,0,0)); y=f((0,1,0)); z=f((0,0,1))
    return {'origin':o,'x':[x[0]-o[0],x[1]-o[1]],'y':[y[0]-o[0],y[1]-o[1]],'z':[z[0]-o[0],z[1]-o[1]]}

info={}
import os
for key in os.environ.get('KEYS','ecl,sub').split(','):
    # --- mask pass full frame
    sc=setup(2); sc.cycles.use_denoising=False
    sc.view_settings.view_transform='Standard'; sc.view_settings.look='None'
    ecl,sub=car_objects(); keep=ecl if key=='ecl' else sub
    isolate(sc,keep,False)
    for m in bpy.data.materials:
        if m.node_tree is None: continue
        nm=m.name
        col=(1,0,0,1) if nm in PAINT[key] else (0,1,0,1) if nm in RIM[key] else (0,0,0,1)
        nt=m.node_tree
        outs=[n for n in nt.nodes if n.bl_idname=='ShaderNodeOutputMaterial']
        for out in outs:
            for l in list(out.inputs['Surface'].links): nt.links.remove(l)
            for k in ('Volume','Displacement'):
                for l in list(out.inputs[k].links): nt.links.remove(l)
            e=nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value=col; e.inputs['Strength'].default_value=1
            nt.links.new(e.outputs[0],out.inputs['Surface'])
    sc.cycles.film_exposure=1.0
    render(f'{OUT}/{key}_mask_full.png')
    im=np.array(Image.open(f'{OUT}/{key}_mask_full.png'))
    ys,xs=np.where(im[...,3]>8)
    m=70
    box=(max(0,xs.min()-m),max(0,ys.min()-m),min(W,xs.max()+m),min(H,ys.max()+m+10))
    print(key,'box',box,flush=True)
    Image.open(f'{OUT}/{key}_mask_full.png').crop(box).save(f'{OUT}/{key}_mask.png')
    # --- beauty pass cropped
    sc=setup(96)
    ecl,sub=car_objects(); keep=ecl if key=='ecl' else sub
    isolate(sc,keep,True)
    set_border(sc,box); sc.render.use_crop_to_border=False
    render(f'{OUT}/{key}_A_full.png')
    # pasada B: solo el garaje (sin el auto) para aislar la sombra del auto
    for o in keep:
        if o.name not in STUDIO: o.hide_render=True
    render(f'{OUT}/{key}_B_full.png')
    A=np.array(Image.open(f'{OUT}/{key}_A_full.png').crop(box)).astype(np.float32)/255
    B=np.array(Image.open(f'{OUT}/{key}_B_full.png').crop(box)).astype(np.float32)/255
    M=np.array(Image.open(f'{OUT}/{key}_mask.png')).astype(np.float32)/255
    carA=M[...,3]
    s_corr=np.clip((A[...,3]-B[...,3])/np.maximum(1-B[...,3],1e-3),0,1)
    s_corr=np.where(s_corr<0.03,0,s_corr)
    outA=carA+(1-carA)*s_corr
    rgb=np.where((carA>0.02)[...,None],A[...,:3],0)
    res=np.dstack([rgb,outA]); Image.fromarray((np.clip(res,0,1)*255).astype(np.uint8),'RGBA').save(f'{OUT}/{key}_beauty.png')
    sc=bpy.context.scene
    a=bpy.data.objects['Eclipse_GarageLife' if key=='ecl' else 'Subaru22B_GarageLife']
    info[key]={'box':[int(v) for v in box],'anchorWorld':list(a.matrix_world.translation)}
    info['proj']=proj_info(sc)
    old=json.load(open(f'{OUT}/info.json')) if os.path.exists(f'{OUT}/info.json') else {}
    old.update(info); json.dump(old,open(f'{OUT}/info.json','w'),indent=1)
    print('done',key,flush=True)
# --- background (no cars)
if os.environ.get('NOBG'): sys.exit(0)
sc=setup(96)
ecl,sub=car_objects()
for o in ecl|sub: o.hide_render=True
bpy.data.objects['Circle.001'].hide_render=True
render(f'{OUT}/garage_bg.png')
print('done bg',flush=True)
