import bpy, sys, json, math
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

W,H=1920,1080
def setup(samples):
    bpy.ops.wm.open_mainfile(filepath=__import__('os').environ.get('BLEND','cartown.blend'))
    sc=bpy.context.scene
    sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=samples
    sc.cycles.use_denoising=True
    sc.render.resolution_x=W; sc.render.resolution_y=H; sc.render.resolution_percentage=100
    sc.render.film_transparent=True
    sc.render.image_settings.file_format='PNG'; sc.render.image_settings.color_mode='RGBA'
    return sc

def car_objects():
    ecl={o for o in bpy.data.collections['ECLIPSE_CAR'].all_objects}
    sub={o for o in bpy.data.collections['SUBARU_22B_CAR'].all_objects}
    for o in list(sub):
        for c in o.children_recursive: sub.add(c)
    for o in list(ecl):
        for c in o.children_recursive: ecl.add(c)
    ecl={o for o in ecl if o.name!='Circle.001'}  # podest
    return ecl,sub

LOGOS=('MitsubishiLogo','EclipseLogo','Subaru Logo','Logo')
def bbox_px(objs,sc,margin=40):
    cam=sc.camera; xs=[];ys=[]
    for o in objs:
        if o.type!='MESH': continue
        for v in o.bound_box:
            p=world_to_camera_view(sc,cam,o.matrix_world@Vector(v))
            xs.append(p.x*W); ys.append((1-p.y)*H)
    return max(0,min(xs)-margin),max(0,min(ys)-margin),min(W,max(xs)+margin),min(H,max(ys)+margin)

def set_border(sc,b):
    x0,y0,x1,y1=b
    sc.render.use_border=True; sc.render.use_crop_to_border=True
    sc.render.border_min_x=x0/W; sc.render.border_max_x=x1/W
    sc.render.border_min_y=1-y1/H; sc.render.border_max_y=1-y0/H
