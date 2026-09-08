import { IconObject } from "_zod";
import { BaseEffectActionNode, getIconFromDoubleUuid } from "pf2e";

class EffectBadgeActionNode extends BaseEffectActionNode<"condition" | "effect"> {
    static get type(): "effect-badge" {
        return "effect-badge";
    }

    static get tags(): string[] {
        return [...BaseEffectActionNode.tags, "condition"];
    }

    get effectTypes(): ["condition", "effect"] {
        return ["condition", "effect"];
    }

    get icon(): IconObject | string | null {
        return getIconFromDoubleUuid.call(this, { unicode: "\uf559", fontWeight: "900" });
    }

    async _execute(): Promise<boolean> {
        const item = await this.getEffect();
        const value = await this.getInputValue("by");

        if (!value || !item) {
            return this.executeNext("out");
        }

        if (item.isOfType("condition")) {
            if (item.system.value.isValued) {
                const current = item.system.value.value;
                const newValue = current + value;

                if (newValue <= 0) {
                    await item.delete();
                } else {
                    await item.update({ "system.value.value": newValue });
                }
            }
            return this.executeNext("out");
        }

        const badge = item.system.badge;

        // effect was expired, we don't increase it and we remove it if negative
        if (badge?.type !== "counter" || item.isExpired) {
            if (value < 0) {
                await item.delete();
            }
            return this.executeNext("out");
        }

        let newValue = badge.value + value;

        if (badge.loop) {
            // we keep looping until we reach a point between min & max
            while (newValue > badge.max) {
                newValue = newValue - badge.max + (badge.min - 1);
            }
            while (newValue < badge.min) {
                newValue = badge.max - 1 + (value - badge.min);
            }
        } else if (newValue < badge.min) {
            // we delete the effect when reaching lower than min
            await item.delete();
            return this.executeNext("out");
        } else {
            newValue = Math.min(newValue, badge.max);
        }

        if (newValue !== badge.value) {
            await item.update({ "system.badge.value": newValue });
        }

        return this.executeNext("out");
    }
}

export { EffectBadgeActionNode };
