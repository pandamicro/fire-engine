/**
 * @category physics
 */

import {
    ccclass,
    help,
    menu,
    property,
} from '../../../../core/data/class-decorator';
import { Constraint } from './constraint';
import { IVec3Like, Vec3 } from '../../../../core';
import { EConstraintType } from '../../physics-enum';

@ccclass('cc.HingeConstraint')
@help('i18n:cc.HingeConstraint')
@menu('Physics/HingeConstraint(beta)')
export class HingeConstraint extends Constraint {

    @property
    axisA: IVec3Like = new Vec3();

    @property
    axisB: IVec3Like = new Vec3();

    @property
    pivotA: IVec3Like = new Vec3();

    @property
    pivotB: IVec3Like = new Vec3();

    constructor () {
        super(EConstraintType.HINGE);
    }
}
