(function (ns) {
    const CREDIT_META = { aetherium: { short: 'AE', color: '#55f0ad' }, sunshards: { short: 'SS', color: '#ffbd59' }, helionite: { short: 'HE', color: '#55d7ff' } };
    function escape(value) { const node = document.createElement('span'); node.textContent = String(value ?? ''); return node.innerHTML; }
    class Component {
        mount(root, context) { this.root = root; this.context = context || {}; return this; }
        render() {}
        destroy() { this.root = null; this.context = null; }
    }
    class Wallet extends Component {
        mount(root, context) {
            super.mount(root, context); root.replaceChildren(); this.nodes = {};
            ns.Wallet.KEYS.forEach(key => {
                const meta = CREDIT_META[key], item = document.createElement('span'); item.className = 'wallet-credit'; item.title = key[0].toUpperCase() + key.slice(1); item.style.setProperty('--credit', meta.color);
                const label = document.createElement('small'), value = document.createElement('b'), pending = document.createElement('em'); label.textContent = meta.short; item.append(label, value, pending); root.append(item); this.nodes[key] = { item, value, pending };
            }); return this;
        }
        render(state, showUnbanked) {
            const wallet = ns.Wallet.ensure(state);
            ns.Wallet.KEYS.forEach(key => { const node = this.nodes[key], pending = wallet.unbanked[key]; node.value.textContent = wallet.banked[key].toLocaleString(); node.pending.textContent = showUnbanked && pending ? `+${pending}` : ''; node.pending.hidden = !node.pending.textContent; });
        }
    }
    class AbilityHud extends Component {
        mount(root, context) {
            super.mount(root, context); root.replaceChildren(); this.nodes = {};
            Object.entries({ abilitySpace: 'SPACE', abilityQ: 'Q', abilityE: 'E', abilityShift: 'SHIFT' }).forEach(([slot, key]) => {
                const item = document.createElement('div'); item.className = 'ability-slot';
                const keyNode = document.createElement('span'); keyNode.className = 'ability-key'; keyNode.textContent = key;
                const detail = document.createElement('span'), name = document.createElement('b'), status = document.createTextNode(''); detail.append(name, status); item.append(keyNode, detail); root.append(item); this.nodes[slot] = { item, name, status };
            }); return this;
        }
        render(state) {
            Object.entries(this.nodes).forEach(([slot, node]) => {
                const info = ns.Abilities.slotState(state, slot), max = info.module?.ability?.cooldown || 1, ready = info.cooldown > 0 ? Math.max(0, 100 - info.cooldown / max * 100) : 100;
                node.item.classList.toggle('locked', !info.unlocked); node.item.classList.toggle('cooling', info.cooldown > 0); node.item.style.setProperty('--ready', `${ready}%`);
                node.name.textContent = info.unlocked ? info.module?.name || 'EMPTY' : 'LOCKED'; node.status.nodeValue = info.cooldown > 0 ? `${info.cooldown.toFixed(1)} SEC` : info.unlocked ? 'READY' : '';
            });
        }
    }
    class DriveHud extends Component {
        mount(root, context) { super.mount(root, context); this.key = root.querySelector('span'); this.name = root.querySelector('strong'); this.status = root.querySelector('small'); this.cost = document.createElement('em'); this.status.replaceChildren(document.createTextNode(''), this.cost); return this; }
        render(game) {
            const visible = ns.LightSpeed.fitted(game);
            this.root.hidden = !visible; this.root.setAttribute('aria-hidden', String(!visible));
            const drive = ns.LightSpeed.status(game);
            this.root.className = `light-drive-hud ${drive.className}`; this.key.textContent = 'R'; this.name.textContent = 'LIGHT SPEED'; this.status.firstChild.nodeValue = drive.label; this.cost.textContent = '5 SS + 5 HE';
        }
    }
    class Objective extends Component {
        mount(root, context) { super.mount(root, context); this.title = root.querySelector('strong'); this.detail = root.querySelector('span'); return this; }
        render(title, detail, warning) { this.title.textContent = title; this.detail.textContent = detail; this.root.classList.toggle('convoy-warning', Boolean(warning)); }
    }
    class TemplatePanel extends Component {
        constructor(render) { super(); this.renderTemplate = render; }
        render(context) { return this.renderTemplate(context); }
    }
    class PanelHost extends Component {
        constructor() { super(); this.panels = new Map(); this.active = null; }
        register(id, component) { this.panels.set(id, component.mount(this.root, this.context)); return this; }
        render(id, context) { const panel = this.panels.get(id) || this.panels.get('pause'); this.active = id; this.root.innerHTML = panel.render(context); return panel; }
        destroy() { this.panels.forEach(panel => panel.destroy()); this.panels.clear(); super.destroy(); }
    }
    ns.Components = { Component, Wallet, AbilityHud, DriveHud, Objective, TemplatePanel, PanelHost, escape, CREDIT_META };
})(window.FrontierWayfarer);
