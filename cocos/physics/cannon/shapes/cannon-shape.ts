import CANNON from '@cocos/cannon';
import { Vec3, Quat } from '../../../core/math';
import { getWrap, setWrap } from '../../framework/util';
import { commitShapeUpdates } from '../cannon-util';
import { PhysicMaterial } from '../../framework/assets/physic-material';
import { IBaseShape } from '../../spec/i-physics-shape';
import { IVec3Like } from '../../../core/math/type-define';
import { CannonSharedBody } from '../cannon-shared-body';
import { CannonWorld } from '../cannon-world';
import { TriggerEventType } from '../../framework/physics-interface';
import { PhysicsSystem } from '../../framework/physics-system';
import { Collider, RigidBody } from '../../framework';
import { aabb, sphere } from '../../../core/geometry';

const TriggerEventObject = {
    type: 'onTriggerEnter' as TriggerEventType,
    selfCollider: null as Collider | null,
    otherCollider: null as Collider | null,
    impl: null as unknown as CANNON.ITriggeredEvent,
};
const cannonQuat_0 = new CANNON.Quaternion();
const cannonVec3_0 = new CANNON.Vec3();
const cannonVec3_1 = new CANNON.Vec3();
export class CannonShape implements IBaseShape {

    static readonly idToMaterial = {};

    get impl () { return this._shape!; }

    get collider () { return this._collider; }

    get attachedRigidBody () {
        if (this._sharedBody.wrappedBody) { return this._sharedBody.wrappedBody.rigidBody; }
        return null;
    }

    get sharedBody (): CannonSharedBody { return this._sharedBody; }

    setMaterial (mat: PhysicMaterial | null) {
        if (mat == null) {
            (this._shape!.material as unknown) = null;
        } else {
            if (CannonShape.idToMaterial[mat._uuid] == null) {
                CannonShape.idToMaterial[mat._uuid] = new CANNON.Material(mat._uuid);
            }

            this._shape.material = CannonShape.idToMaterial[mat._uuid];
            this._shape.material.friction = mat.friction;
            this._shape.material.restitution = mat.restitution;
        }
    }

    setAsTrigger (v: boolean) {
        this._shape.collisionResponse = !v;
        if (this._index >= 0) {
            this._body.updateHasTrigger();
        }
    }

    setCenter (v: IVec3Like) {
        this._setCenter(v);
        if (this._index >= 0) {
            commitShapeUpdates(this._body);
        }
    }

    setAttachedBody (v: RigidBody | null) {
        if (v) {
            if (this._sharedBody) {
                if (this._sharedBody.wrappedBody == v.body) return;

                this._sharedBody.reference = false;
            }

            this._sharedBody = (PhysicsSystem.instance.physicsWorld as CannonWorld).getSharedBody(v.node);
            this._sharedBody.reference = true;
        } else {
            if (this._sharedBody) {
                this._sharedBody.reference = false;
            }

            this._sharedBody = (PhysicsSystem.instance.physicsWorld as CannonWorld).getSharedBody(this._collider.node);
            this._sharedBody.reference = true;
        }
    }

    getAABB (v: aabb) {
        Quat.copy(cannonQuat_0, this._collider.node.worldRotation);
        // TODO: typing
        (this._shape as any).calculateWorldAABB(CANNON.Vec3.ZERO, cannonQuat_0, cannonVec3_0, cannonVec3_1);
        Vec3.subtract(v.halfExtents, cannonVec3_1, cannonVec3_0);
        Vec3.multiplyScalar(v.halfExtents, v.halfExtents, 0.5);
        Vec3.add(v.center, this._collider.node.worldPosition, this._collider.center);
    }

    getBoundingSphere (v: sphere) {
        v.radius = this._shape.boundingSphereRadius;
        Vec3.add(v.center, this._collider.node.worldPosition, this._collider.center);
    }

    protected _collider!: Collider;
    protected _shape!: CANNON.Shape;
    protected _offset = new CANNON.Vec3();
    protected _orient = new CANNON.Quaternion();
    protected _index: number = -1;
    protected _sharedBody!: CannonSharedBody;
    protected get _body (): CANNON.Body { return this._sharedBody.body; }
    protected onTriggerListener = this._onTrigger.bind(this);
    protected _isBinding = false;

    /** LIFECYCLE */

    initialize (comp: Collider) {
        this._collider = comp;
        this._isBinding = true;
        this.onComponentSet();
        setWrap(this._shape, this);
        this._shape.addEventListener('cc-trigger', this.onTriggerListener);
        this._sharedBody = (PhysicsSystem.instance.physicsWorld as CannonWorld).getSharedBody(this._collider.node);
        this._sharedBody.reference = true;
    }

    // virtual
    protected onComponentSet () { }

    onLoad () {
        this.setMaterial(this._collider.sharedMaterial);
        this.setCenter(this._collider.center);
        this.setAsTrigger(this._collider.isTrigger);
    }

    onEnable () {
        this._sharedBody.addShape(this);
        this._sharedBody.enabled = true;
    }

    onDisable () {
        this._sharedBody.removeShape(this);
        this._sharedBody.enabled = false;
    }

    onDestroy () {
        this._sharedBody.reference = false;
        this._shape.removeEventListener('cc-trigger', this.onTriggerListener);
        delete CANNON.World['idToShapeMap'][this._shape.id];
        (this._sharedBody as any) = null;
        setWrap(this._shape, null);
        (this._offset as any) = null;
        (this._orient as any) = null;
        (this._shape as any) = null;
        (this._collider as any) = null;
        (this.onTriggerListener as any) = null;
    }

    /** INTERFACE */

    /** group */
    getGroup (): number {
        return this._body.collisionFilterGroup;
    }

    setGroup (v: number): void {
        this._body.collisionFilterGroup = v;
        if (!this._body.isAwake()) this._body.wakeUp();
    }

    addGroup (v: number): void {
        this._body.collisionFilterGroup |= v;
        if (!this._body.isAwake()) this._body.wakeUp();
    }

    removeGroup (v: number): void {
        this._body.collisionFilterGroup &= ~v;
        if (!this._body.isAwake()) this._body.wakeUp();
    }

    /** mask */
    getMask (): number {
        return this._body.collisionFilterMask;
    }

    setMask (v: number): void {
        this._body.collisionFilterMask = v;
        if (!this._body.isAwake()) this._body.wakeUp();
    }

    addMask (v: number): void {
        this._body.collisionFilterMask |= v;
        if (!this._body.isAwake()) this._body.wakeUp();
    }

    removeMask (v: number): void {
        this._body.collisionFilterMask &= ~v;
        if (!this._body.isAwake()) this._body.wakeUp();
    }

    /**
     * change scale will recalculate center & size \
     * size handle by child class
     * @param scale 
     */
    setScale (scale: IVec3Like) {
        this._setCenter(this._collider.center);
    }

    setIndex (index: number) {
        this._index = index;
    }

    setOffsetAndOrient (offset: CANNON.Vec3, orient: CANNON.Quaternion) {
        Vec3.copy(offset, this._offset);
        Quat.copy(orient, this._orient);
        this._offset = offset;
        this._orient = orient;
    }

    protected _setCenter (v: IVec3Like) {
        const lpos = this._offset as IVec3Like;
        Vec3.subtract(lpos, this._sharedBody.node.worldPosition, this._collider.node.worldPosition);
        Vec3.add(lpos, lpos, v);
        Vec3.multiply(lpos, lpos, this._collider.node.worldScale);
    }

    protected _onTrigger (event: CANNON.ITriggeredEvent) {
        TriggerEventObject.type = event.event;
        const self = getWrap<CannonShape>(event.selfShape);
        const other = getWrap<CannonShape>(event.otherShape);

        if (self && self.collider.needTriggerEvent) {
            TriggerEventObject.selfCollider = self.collider;
            TriggerEventObject.otherCollider = other ? other.collider : null;
            TriggerEventObject.impl = event;
            this._collider.emit(TriggerEventObject.type, TriggerEventObject);
        }
    }
}
