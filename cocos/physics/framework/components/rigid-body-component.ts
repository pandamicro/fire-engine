/**
 * 物理模块
 * @category physics
 */

import {
    ccclass,
    help,
    disallowMultiple,
    executeInEditMode,
    menu,
    property,
    executionOrder,
    tooltip,
    displayOrder,
    visible,
    type,
} from '../../../core/data/class-decorator';
import { Vec3 } from '../../../core/math';
import { Component, error } from '../../../core';
import { IRigidBody } from '../../spec/i-rigid-body';
import { createRigidBody } from '../instance';
import { EDITOR } from 'internal:constants';
import { ERigidBodyType } from '../physics-enum';
import { PhysicsSystem } from '../physics-system';
import { legacyCC } from '../../../core/global-exports';

/**
 * @en
 * Rigid body component.
 * @zh
 * 刚体组件。
 */
@ccclass('cc.RigidBody')
@help('i18n:cc.RigidBody')
@menu('Physics/RigidBody')
@executeInEditMode
@disallowMultiple
@executionOrder(-1)
export class RigidBody extends Component {

    static readonly ERigidBodyType = ERigidBodyType;

    /// PUBLIC PROPERTY GETTER\SETTER ///

    /**
     * @en
     * Gets or sets the group of the rigid body.
     * @zh
     * 获取或设置分组。
     */
    @type(PhysicsSystem.PhysicsGroup)
    @displayOrder(-2)
    @tooltip('设置分组')
    public get group (): number {
        return this._group;
    }

    public set group (v: number) {
        this._group = v;
        if (this._body) {
            this._body.setGroup(v);
        }
    }

    /**
     * @en
     * Gets or sets the mass of the rigid body.
     * @zh
     * 获取或设置刚体的质量。
     */
    @displayOrder(0)
    @tooltip('刚体的质量')
    public get mass () {
        return this._mass;
    }

    public set mass (value) {
        value = value < 0 ? 0 : value;
        this._mass = value;
        if (this._body) {
            this._body.setMass(value);
        }
    }

    /**
     * @en
     * Gets or sets whether hibernation is allowed.
     * @zh
     * 获取或设置是否允许休眠。
     */
    @displayOrder(0.5)
    @visible(function (this: RigidBody) { return this._mass != 0; })
    @tooltip('是否允许休眠')
    public get allowSleep (): boolean {
        return this._allowSleep;
    }

    public set allowSleep (v: boolean) {
        this._allowSleep = v;
        if (this._body) {
            this._body.setAllowSleep(v);
        }
    }

    /**
     * @en
     * Gets or sets linear damping.
     * @zh
     * 获取或设置线性阻尼。
     */
    @displayOrder(1)
    @visible(function (this: RigidBody) { return this._mass != 0; })
    @tooltip('线性阻尼')
    public get linearDamping () {
        return this._linearDamping;
    }

    public set linearDamping (value) {
        this._linearDamping = value;
        if (this._body) {
            this._body.setLinearDamping(value);
        }
    }

    /**
     * @en
     * Gets or sets the rotation damping.
     * @zh
     * 获取或设置旋转阻尼。
     */
    @displayOrder(2)
    @visible(function (this: RigidBody) { return this._mass != 0; })
    @tooltip('旋转阻尼')
    public get angularDamping () {
        return this._angularDamping;
    }

    public set angularDamping (value) {
        this._angularDamping = value;
        if (this._body) {
            this._body.setAngularDamping(value);
        }
    }

    /**
     * @en
     * Gets or sets whether a rigid body is controlled by a physical system.
     * @zh
     * 获取或设置刚体是否由物理系统控制运动。
     */
    @displayOrder(3)
    @visible(function (this: RigidBody) { return this._mass != 0; })
    @tooltip('刚体是否由物理系统控制运动')
    public get isKinematic () {
        return this._isKinematic;
    }

    public set isKinematic (value) {
        this._isKinematic = value;
        if (this._body) {
            this._body.setIsKinematic(value);
        }
    }

    /**
     * @en
     * Gets or sets whether a rigid body uses gravity.
     * @zh
     * 获取或设置刚体是否使用重力。
     */
    @displayOrder(4)
    @visible(function (this: RigidBody) { return this._mass != 0; })
    @tooltip('刚体是否使用重力')
    public get useGravity () {
        return this._useGravity;
    }

    public set useGravity (value) {
        this._useGravity = value;
        if (this._body) {
            this._body.useGravity(value);
        }
    }

    /**
     * @en
     * Gets or sets whether the rigid body is fixed for rotation.
     * @zh
     * 获取或设置刚体是否固定旋转。
     */
    @displayOrder(5)
    @visible(function (this: RigidBody) { return this._mass != 0; })
    @tooltip('刚体是否固定旋转')
    public get fixedRotation () {
        return this._fixedRotation;
    }

    public set fixedRotation (value) {
        this._fixedRotation = value;
        if (this._body) {
            this._body.fixRotation(value);
        }
    }

    /**
     * @en
     * Gets or sets the linear velocity factor that can be used to control the scaling of the velocity in each axis direction.
     * @zh
     * 获取或设置线性速度的因子，可以用来控制每个轴方向上的速度的缩放。
     */
    @displayOrder(6)
    @visible(function (this: RigidBody) { return this._mass != 0; })
    @tooltip('线性速度的因子，可以用来控制每个轴方向上的速度的缩放')
    public get linearFactor () {
        return this._linearFactor;
    }

    public set linearFactor (value: Vec3) {
        Vec3.copy(this._linearFactor, value);
        if (this._body) {
            this._body.setLinearFactor(this._linearFactor);
        }
    }

    /**
     * @en
     * Gets or sets the rotation speed factor that can be used to control the scaling of the rotation speed in each axis direction.
     * @zh
     * 获取或设置旋转速度的因子，可以用来控制每个轴方向上的旋转速度的缩放。
     */
    @displayOrder(7)
    @visible(function (this: RigidBody) { return this._mass != 0; })
    @tooltip('旋转速度的因子，可以用来控制每个轴方向上的旋转速度的缩放')
    public get angularFactor () {
        return this._angularFactor;
    }

    public set angularFactor (value: Vec3) {
        Vec3.copy(this._angularFactor, value);
        if (this._body) {
            this._body.setAngularFactor(this._angularFactor);
        }
    }

    /**
     * @en
     * Gets or sets the speed threshold for going to sleep.
     * @zh
     * 获取或设置进入休眠的速度临界值。
     */
    public get sleepThreshold (): number {
        if (this._assertOnLoadCalled) {
            return this._body!.getSleepThreshold();
        }
        return 0;
    }

    public set sleepThreshold (v: number) {
        if (this._assertOnLoadCalled) {
            this._body!.setSleepThreshold(v);
        }
    }

    /**
     * @en
     * Gets whether it is the state of awake.
     * @zh
     * 获取是否是唤醒的状态。
     */
    public get isAwake (): boolean {
        if (this._assertOnLoadCalled) {
            return this._body!.isAwake;
        }
        return false;
    }

    /**
     * @en
     * Gets whether you can enter a dormant state.
     * @zh
     * 获取是否是可进入休眠的状态。
     */
    public get isSleepy (): boolean {
        if (this._assertOnLoadCalled) {
            return this._body!.isSleepy;
        }
        return false;
    }

    /**
     * @en
     * Gets whether the state is dormant.
     * @zh
     * 获取是否是正在休眠的状态。
     */
    public get isSleeping (): boolean {
        if (this._assertOnLoadCalled) {
            return this._body!.isSleeping;
        }
        return false;
    }

    /**
     * @en
     * Gets the wrapper object, through which the lowLevel instance can be accessed.
     * @zh
     * 获取封装对象，通过此对象可以访问到底层实例。
     */
    public get body () {
        return this._body;
    }

    private _body: IRigidBody | null = null;

    /// PRIVATE PROPERTY ///

    @property
    private _group: number = PhysicsSystem.PhysicsGroup.DEFAULT;

    @property
    private _mass: number = 1;

    @property
    private _allowSleep: boolean = true;

    @property
    private _linearDamping: number = 0.1;

    @property
    private _angularDamping: number = 0.1;

    @property
    private _fixedRotation: boolean = false;

    @property
    private _isKinematic: boolean = false;

    @property
    private _useGravity: boolean = true;

    @property
    private _linearFactor: Vec3 = new Vec3(1, 1, 1);

    @property
    private _angularFactor: Vec3 = new Vec3(1, 1, 1);

    protected get _assertOnLoadCalled (): boolean {
        const r = this._isOnLoadCalled == 0;
        if (r) { error('[Physics]: Please make sure that the node has been added to the scene'); }
        return !r;
    }

    protected get _assertUseCollisionMatrix (): boolean {
        if (PhysicsSystem.instance.useCollisionMatrix) {
            error('[Physics]: useCollisionMatrix is turn on, using collision matrix instead please.');
        }
        return PhysicsSystem.instance.useCollisionMatrix;
    }

    /// COMPONENT LIFECYCLE ///

    protected onLoad () {
        if (!EDITOR) {
            this._body = createRigidBody();
            this._body.initialize(this);
        }
    }

    protected onEnable () {
        if (this._body) {
            this._body.onEnable!();
        }
    }

    protected onDisable () {
        if (this._body) {
            this._body.onDisable!();
        }
    }

    protected onDestroy () {
        if (this._body) {
            this._body.onDestroy!();
        }
    }

    /// PUBLIC METHOD ///

    /**
     * @en
     * Apply force to a world point. This could, for example, be a point on the Body surface.
     * @zh
     * 在世界空间中，相对于刚体的质心的某点上对刚体施加作用力。
     * @param force - 作用力
     * @param relativePoint - 作用点，相对于刚体的质心
     */
    public applyForce (force: Vec3, relativePoint?: Vec3) {
        if (this._assertOnLoadCalled) {
            this._body!.applyForce(force, relativePoint);
        }
    }

    /**
     * @en
     * Apply force to a local point. This could, for example, be a point on the Body surface.
     * @zh
     * 在本地空间中，相对于刚体的质心的某点上对刚体施加作用力。
     * @param force - 作用力
     * @param localPoint - 作用点
     */
    public applyLocalForce (force: Vec3, localPoint?: Vec3) {
        if (this._assertOnLoadCalled) {
            this._body!.applyLocalForce(force, localPoint);
        }
    }

    /**
     * @en
     * In world space, impulse is applied to the rigid body at some point relative to the center of mass of the rigid body.
     * @zh
     * 在世界空间中，相对于刚体的质心的某点上对刚体施加冲量。
     * @param impulse - 冲量
     * @param relativePoint - 作用点，相对于刚体的中心点
     */
    public applyImpulse (impulse: Vec3, relativePoint?: Vec3) {
        if (this._assertOnLoadCalled) {
            this._body!.applyImpulse(impulse, relativePoint);
        }
    }

    /**
     * @en
     * In local space, impulse is applied to the rigid body at some point relative to the center of mass of the rigid body.
     * @zh
     * 在本地空间中，相对于刚体的质心的某点上对刚体施加冲量。
     * @param impulse - 冲量
     * @param localPoint - 作用点
     */
    public applyLocalImpulse (impulse: Vec3, localPoint?: Vec3) {
        if (this._assertOnLoadCalled) {
            this._body!.applyLocalImpulse(impulse, localPoint);
        }
    }

    /**
     * @en
     * In world space, torque is applied to the rigid body.
     * @zh
     * 在世界空间中，对刚体施加扭矩。
     * @param torque - 扭矩
     */
    public applyTorque (torque: Vec3) {
        if (this._assertOnLoadCalled) {
            this._body!.applyTorque(torque);
        }
    }

    /**
     * @zh
     * 在本地空间中，对刚体施加扭矩。
     * @param torque - 扭矩
     */
    public applyLocalTorque (torque: Vec3) {
        if (this._assertOnLoadCalled) {
            this._body!.applyLocalTorque(torque);
        }
    }

    /**
     * @en
     * Wake up the rigid body.
     * @zh
     * 唤醒刚体。
     */
    public wakeUp () {
        if (this._assertOnLoadCalled) {
            this._body!.wakeUp();
        }
    }

    /**
     * @en
     * Dormancy of rigid body.
     * @zh
     * 休眠刚体。
     */
    public sleep () {
        if (this._assertOnLoadCalled) {
            this._body!.sleep();
        }
    }

    /**
     * @en
     * Clear the forces and velocity of the rigid body.
     * @zh
     * 清除刚体受到的力和速度。
     */
    public clearState () {
        if (this._assertOnLoadCalled) {
            this._body!.clearState();
        }
    }

    /**
     * @en
     * Clear the forces of the rigid body.
     * @zh
     * 清除刚体受到的力。
     */
    public clearForces () {
        if (this._assertOnLoadCalled) {
            this._body!.clearForces();
        }
    }

    /**
     * @en
     * Clear velocity of the rigid body.
     * @zh
     * 清除刚体的速度。
     */
    public clearVelocity () {
        if (this._assertOnLoadCalled) {
            this._body!.clearVelocity();
        }
    }

    /**
     * @en
     * Gets the linear velocity.
     * @zh
     * 获取线性速度。
     * @param out 速度 Vec3
     */
    public getLinearVelocity (out: Vec3) {
        if (this._assertOnLoadCalled) {
            this._body!.getLinearVelocity(out);
        }
    }

    /**
     * @en
     * Sets the linear velocity.
     * @zh
     * 设置线性速度。
     * @param value 速度 Vec3
     */
    public setLinearVelocity (value: Vec3): void {
        if (this._assertOnLoadCalled) {
            this._body!.setLinearVelocity(value);
        }
    }

    /**
     * @en
     * Gets the angular velocity.
     * @zh
     * 获取旋转速度。
     * @param out 速度 Vec3
     */
    public getAngularVelocity (out: Vec3) {
        if (this._assertOnLoadCalled) {
            this._body!.getAngularVelocity(out);
        }
    }

    /**
     * @en
     * Sets the angular velocity.
     * @zh
     * 设置旋转速度。
     * @param value 速度 Vec3
     */
    public setAngularVelocity (value: Vec3): void {
        if (this._assertOnLoadCalled) {
            this._body!.setAngularVelocity(value);
        }
    }

    /// GROUP MASK ///

    /**
     * @en
     * Gets the group value.
     * @zh
     * 获取分组值。
     * @returns 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    public getGroup (): number {
        if (this._assertOnLoadCalled) {
            return this._body!.getGroup();
        }
        return 0;
    }

    /**
     * @en
     * Sets the group value.
     * @zh
     * 设置分组值。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    public setGroup (v: number): void {
        if (this._assertOnLoadCalled) {
            this.group = v;
        }
    }

    /**
     * @en
     * Add a grouping value to fill in the group you want to join.
     * @zh
     * 添加分组值，可填要加入的 group。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    public addGroup (v: number) {
        if (this._assertOnLoadCalled && !this._assertUseCollisionMatrix) {
            this._body!.addGroup(v);
        }
    }

    /**
     * @en
     * Subtract the grouping value to fill in the group to be removed.
     * @zh
     * 减去分组值，可填要移除的 group。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    public removeGroup (v: number) {
        if (this._assertOnLoadCalled && !this._assertUseCollisionMatrix) {
            this._body!.removeGroup(v);
        }
    }

    /**
     * @en
     * Gets the mask value.
     * @zh
     * 获取掩码值。
     * @returns 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    public getMask (): number {
        if (this._assertOnLoadCalled) {
            return this._body!.getMask();
        }
        return 0;
    }

    /**
     * @en
     * Sets the mask value.
     * @zh
     * 设置掩码值。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    public setMask (v: number) {
        if (this._assertOnLoadCalled && !this._assertUseCollisionMatrix) {
            this._body!.setMask(v);
        }
    }

    /**
     * @en
     * Add mask values to fill in groups that need to be checked.
     * @zh
     * 添加掩码值，可填入需要检查的 group。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    public addMask (v: number) {
        if (this._assertOnLoadCalled && !this._assertUseCollisionMatrix) {
            this._body!.addMask(v);
        }
    }

    /**
     * @en
     * Subtract the mask value to fill in the group that does not need to be checked.
     * @zh
     * 减去掩码值，可填入不需要检查的 group。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    public removeMask (v: number) {
        if (this._assertOnLoadCalled && !this._assertUseCollisionMatrix) {
            this._body!.removeMask(v);
        }
    }

}

export namespace RigidBody {
    export type ERigidBodyType = EnumAlias<typeof ERigidBodyType>;
}

export { RigidBody as RigidBodyComponent };
