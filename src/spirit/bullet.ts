import { dirNum } from '../global/var';
import { brickStatus } from '../global/var';
import { roadMap } from '../map/affirmRoadMap';
import { getPositionInBrick } from '../util/fn';
import { CXT_BG, CXT_ROLE, OFFSET_X, OFFSET_Y } from '../global/const';
import Mover from './mover';
import res from '../data/assets';
import eventBus from '../util/eventBus';
import BulletCollision from '../collision/bulletCollisionDetection';

const BULLET_IMG = res.img.misc;
const ATTACK_OVER_AUD = res.audio.attackOver;

export default class Bullet extends Mover {
  // override
  private dirNum: number;
  private detectionCollision: BulletCollision;
  protected type: string;
  protected distanceToCenter: number;
  protected next_x: number;
  protected next_y: number;
  protected speed: number;

  constructor(
    protected x: number,
    protected y: number,
    protected direction: string,
    protected rank: number,
    private bulletType: string,
    public id: number
  ) {
    super();

    this.speed = this.rank ? 5 : 4;
    this.distanceToCenter = 4;
    this.detectionCollision = new BulletCollision();
    this.dirNum = dirNum[direction];

    this.resetPosition();
  }

  // 子弹初始输入的坐标是坦克的坐标，因此需要重置一下
  private resetPosition() {
    const reset = {
      W: [this.x + 12, this.y],
      A: [this.x, this.y + 12],
      S: [this.x + 12, this.y + 24],
      D: [this.x + 24, this.y + 12]
    };

    [this.x, this.y] = reset[this.direction];
  }

  // 清除一小块的砖块
  private clearSmallBrick(row: number, col: number) {
    const indexInBrick = getPositionInBrick.bind(this)(this.next_x, this.next_y, row, col);
    const brickStatusArr = brickStatus[row * 28 + col];

    let x, y, rangeX, rangeY;

    if (this.dirNum % 2) {
      [x, y, rangeX, rangeY] = [col * 16 + 8 * indexInBrick, row * 16, 8, 16];
      [0, 1].forEach(ele => (brickStatusArr[ele][indexInBrick] = 0));
    } else {
      [x, y, rangeX, rangeY] = [col * 16, row * 16 + 8 * indexInBrick, 16, 8];
      brickStatusArr[indexInBrick] = [0, 0];
    }

    CXT_BG.clearRect(OFFSET_X + x, OFFSET_Y + y, rangeX, rangeY);
  }

  // 清除一大块的障碍物
  private clearBigBlock(row: number, col: number) {
    roadMap[row][col] = 0;
    CXT_BG.clearRect(OFFSET_X + col * 16, OFFSET_Y + row * 16, 16, 16);
  }

  // 子弹击中砖块
  private touchBrick(collisionRow: number, collisionCol: number) {
    if (this.rank <= 1) {
      // 子弹等级<= 1时击中砖块后清除砖块
      const _index = collisionRow * 28 + collisionCol;

      !brickStatus[_index] && (brickStatus[_index] = [[1, 1], [1, 1]]);
      this.clearSmallBrick(collisionRow, collisionCol);
    } else {
      this.clearBigBlock(collisionRow, collisionCol);
    }
  }

  // 子弹击中钢筋
  private touchSteel(collisionRow: number, collisionCol: number) {
    this.rank === 3
      ? this.clearBigBlock(collisionRow, collisionCol)
      : (this.bulletType === 'player') && ATTACK_OVER_AUD.play();
  }

  // 子弹击中老家
  private touchHome() {
  }

  // 子弹击中坦克
  private touchTank() {
  }

  // 子弹击中边界
  private touchBorder() {
    (this.bulletType === 'player') && ATTACK_OVER_AUD.play();
  }

  // override
  protected doAfterCollision(collisionInfo: CollisionInfoItem[]) {
    collisionInfo.forEach(ele => {
      if (typeof this[`touch${ele.collisionType}`] === 'function') {
        const [row, col] = ele.row ? [ele.row, ele.col] : [void 0, void 0];

        this[`touch${ele.collisionType}`](row, col);
      }
    });
  }

  // override
  protected affirmPosition() {
    [this.next_x, this.next_y] = this.getNextPositionIfCouldMove();
    this.collisionInfo = this.detectionCollision.getCollisionInfo(this.direction, this.next_x, this.next_y, this.bulletType, this.id);

    if (this.collisionInfo.isCollision) {
      this.doAfterCollision(this.collisionInfo.info);
      // 事件注册在drawTank
      eventBus.dispatch('bullet-die', this.id, this.bulletType);
      this.alive = false;
    } else {
      // 如果没有碰撞则确定位置
      [this.x, this.y] = [this.next_x, this.next_y];
    }
  }

  // override
  public draw() {
    this.affirmPosition();
    CXT_ROLE.drawImage(BULLET_IMG, dirNum[this.direction] << 3, 0, 8, 8, this.x + OFFSET_X, this.y + OFFSET_Y, 8, 8);
  }
}