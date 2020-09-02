
/**
 * @category particle
 */

import { ccclass, property, tooltip, displayOrder, type, formerlySerializedAs } from '../../core/data/class-decorator';
import { lerp, pseudoRandom, repeat } from '../../core/math';
import { Enum } from '../../core/value-types';
import { Particle, ParticleModuleBase, PARTICLE_MODULE_NAME } from '../particle';
import CurveRange from './curve-range';
import { ModuleRandSeed } from '../enum';

// tslint:disable: max-line-length
const TEXTURE_ANIMATION_RAND_OFFSET = ModuleRandSeed.TEXTURE;

/**
 * 粒子贴图动画类型。
 * @enum textureAnimationModule.Mode
 */
const Mode = Enum({
    /**
     * 网格类型。
     */
    Grid: 0,

    /**
     * 精灵类型（暂未支持）。
     */
    // Sprites: 1,
});

/**
 * 贴图动画的播放方式。
 * @enum textureAnimationModule.Animation
 */
const Animation = Enum({
    /**
     * 播放贴图中的所有帧。
     */
    WholeSheet: 0,

    /**
     * 播放贴图中的其中一行动画。
     */
    SingleRow: 1,
});

@ccclass('cc.TextureAnimationModule')
export default class TextureAnimationModule extends ParticleModuleBase {

    @property
    private _enable = false;

    @formerlySerializedAs('numTilesX')
    private _numTilesX = 0;

    @formerlySerializedAs('numTilesY')
    private _numTilesY = 0;

    /**
     * @zh 是否启用。
     */
    @displayOrder(0)
    get enable () {
        return this._enable;
    }

    set enable (val) {
        if (this._enable === val) return;
        this._enable = val;
        if (!this.target) return;
        this.target.updateMaterialParams();
        this.target.enableModule(this.name, val, this);
    }

    @type(Mode)
    private _mode = Mode.Grid;

    /**
     * @zh 设定粒子贴图动画的类型（暂只支持 Grid 模式）[[Mode]]。
     */
    @type(Mode)
    @displayOrder(1)
    @tooltip('设定粒子贴图动画的类型（暂只支持 Grid 模式）')
    get mode () {
        return this._mode;
    }

    set mode (val) {
        if (val !== Mode.Grid) {
            console.error('particle texture animation\'s sprites is not supported!');
            return;
        }
    }

    /**
     * @zh X 方向动画帧数。
     */
    @displayOrder(2)
    @tooltip('X 方向动画帧数')
    get numTilesX () {
        return this._numTilesX;
    }

    set numTilesX (val) {
        if (this._numTilesX !== val) {
            this._numTilesX = val;
            this.target!.updateMaterialParams();
        }
    }

    /**
     * @zh Y 方向动画帧数。
     */
    @displayOrder(3)
    @tooltip('Y 方向动画帧数')
    get numTilesY () {
        return this._numTilesY;
    }

    set numTilesY (val) {
        if (this._numTilesY !== val) {
            this._numTilesY = val;
            this.target!.updateMaterialParams();
        }
    }

    /**
     * @zh 动画播放方式 [[Animation]]。
     */
    @type(Animation)
    @displayOrder(4)
    @tooltip('动画播放方式')
    public animation = Animation.WholeSheet;

    /**
     * @zh 一个周期内动画播放的帧与时间变化曲线。
     */
    @type(CurveRange)
    @displayOrder(7)
    @tooltip('一个周期内动画播放的帧与时间变化曲线')
    public frameOverTime = new CurveRange();

    /**
     * @zh 从第几帧开始播放，时间为整个粒子系统的生命周期。
     */
    @type(CurveRange)
    @displayOrder(8)
    @tooltip('从第几帧开始播放，时间为整个粒子系统的生命周期')
    public startFrame = new CurveRange();

    /**
     * @zh 一个生命周期内播放循环的次数。
     */
    @property
    @displayOrder(9)
    @tooltip('一个生命周期内播放循环的次数')
    public cycleCount = 0;

    @property
    private _flipU = 0;

    /**
     * @ignore
     */
    get flipU () {
        return this._flipU;
    }

    set flipU (val) {
        console.error('particle texture animation\'s flipU is not supported!');
    }

    @property
    private _flipV = 0;

    get flipV () {
        return this._flipV;
    }

    set flipV (val) {
        console.error('particle texture animation\'s flipV is not supported!');
    }

    @property
    private _uvChannelMask = -1;

    get uvChannelMask () {
        return this._uvChannelMask;
    }

    set uvChannelMask (val) {
        console.error('particle texture animation\'s uvChannelMask is not supported!');
    }

    /**
     * @zh 随机从动画贴图中选择一行以生成动画。<br>
     * 此选项仅在动画播放方式为 SingleRow 时生效。
     */
    @property
    @displayOrder(5)
    @tooltip('随机从动画贴图中选择一行以生成动画。\n此选项仅在动画播放方式为 SingleRow 时生效')
    public randomRow = false;

    /**
     * @zh 从动画贴图中选择特定行以生成动画。<br>
     * 此选项仅在动画播放方式为 SingleRow 时且禁用 randomRow 时可用。
     */
    @property
    @displayOrder(6)
    @tooltip('从动画贴图中选择特定行以生成动画。\n此选项仅在动画播放方式为 SingleRow 时且禁用 randomRow 时可用')
    public rowIndex = 0;
    
    public name = PARTICLE_MODULE_NAME.TEXTURE;

    public init (p: Particle) {
        p.startRow = Math.floor(Math.random() * this.numTilesY);
    }

    public animate (p: Particle, dt: number) {
        const normalizedTime = 1 - p.remainingLifetime / p.startLifetime;
        const startFrame = this.startFrame.evaluate(normalizedTime, pseudoRandom(p.randomSeed + TEXTURE_ANIMATION_RAND_OFFSET))! / (this.numTilesX * this.numTilesY);
        if (this.animation === Animation.WholeSheet) {
            p.frameIndex = repeat(this.cycleCount * (this.frameOverTime.evaluate(normalizedTime, pseudoRandom(p.randomSeed + TEXTURE_ANIMATION_RAND_OFFSET))! + startFrame), 1);
        }
        else if (this.animation === Animation.SingleRow) {
            const rowLength = 1 / this.numTilesY;
            if (this.randomRow) {
                const f = repeat(this.cycleCount * (this.frameOverTime.evaluate(normalizedTime, pseudoRandom(p.randomSeed + TEXTURE_ANIMATION_RAND_OFFSET))! + startFrame), 1);
                const from = p.startRow * rowLength;
                const to = from + rowLength;
                p.frameIndex = lerp(from, to, f);
            }
            else {
                const from = this.rowIndex * rowLength;
                const to = from + rowLength;
                p.frameIndex = lerp(from, to, repeat(this.cycleCount * (this.frameOverTime.evaluate(normalizedTime, pseudoRandom(p.randomSeed + TEXTURE_ANIMATION_RAND_OFFSET))! + startFrame), 1));
            }
        }
    }
}
