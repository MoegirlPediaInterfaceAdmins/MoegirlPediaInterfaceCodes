/* eslint-disable @eslint-community/eslint-comments/no-unlimited-disable */
/* eslint-disable */
// just fuck off, eslint

'use strict';

const 常量_山不在高 = 1200
const 常量_把用户放在我心里 = 'moegirl:april-fool-2025'

class MoeCaptcha extends HTMLElement {
    constructor() {
        super();

        // 创建 Shadow DOM
        const shadow = this.attachShadow({ mode: 'open' });

        // 合并元素
        shadow.appendChild(this.createStyle());
        shadow.appendChild(this.createContainer());
    }

    /**
     * 创建样式
     */
    createStyle() {
        const style = document.createElement('style');
        style.textContent = `
:host {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
}

.moe-captcha {
    font-size: 14px;
    width: 320px;
    border: 1px solid #aaa;
    background: #f8f8f8;
    color: #222;
    border-radius: 0.5em;
    display: inline-flex;
    gap: 1em;
    align-items: center;
    padding: 0.5em;
}

.loader {
    width: 42px;
    height: 42px;
    border: 5px dotted #02A54D;
    border-radius: 50%;
    display: inline-block;
    position: relative;
    box-sizing: border-box;
    animation: rotation 3.6s linear infinite;
}

.moe-captcha-text {
    flex: 1;
}

.moe-captcha-text .title {
    margin: 0 0 0.5em 0;
    font-size: 1.25em;
    font-weight: 700;
}

.moe-captcha-image img {
    width: 72px;
}

@keyframes rotation {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
    `;
        return style;
    }

    /**
     * 创建容器
     */
    createContainer() {
        const container = document.createElement('div');
        container.classList.add('moe-captcha');
        container.innerHTML = `
<div class="moe-captcha-spin">
    <span class="loader"></span>
</div>
<div class="moe-captcha-text">
    <div class="title">我们怀疑你是人类</div>
    <div class="prompt">点我完成验证🐴才能继续</div>
</div>
<div class="moe-captcha-image">
    <img src="https://r2.epb.wiki/-/2025/03/31/5d97bb8c0b7563552b0c178a800c1b358e3a8ab9.png" alt="CAPTCHA">
</div>
    `;
        return container;
    }
}

// 注册自定义组件
if (!customElements.get('moe-captcha')) {
    customElements.define('moe-captcha', MoeCaptcha);
}

/**
 * @param {JQuery<HTMLDivElement>} $整个内容区域 
 */
function 皮一下($整个内容区域, 超过此高度 = 常量_山不在高) {
    const $文章 = $整个内容区域.find('.mw-parser-output');
    const 内容高度 = $整个内容区域.height();
    // 内容高度小于 LIMIT 或者没有内容
    if (内容高度 < 超过此高度 || $文章.length === 0) {
        return;
    }

    const $覆盖层 = $('<div class="moe-captcha-cover"></div>');
    $覆盖层.css({
        position: 'relative',
        width: '100%',
        backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0), rgb(255, 255, 255) 50px, rgb(255, 255, 255))',
        marginTop: '-50px',
        padding: '1rem',
        paddingTop: '80px',
        textAlign: 'center',
        zIndex: 9999,
    });
    const $验证码 = $('<moe-captcha></moe-captcha>');
    $覆盖层.append($验证码);
    const $别烦我 = $('<a class="moe-captcha-after-text">能不能别烦我（｀へ´）</a>');
    $覆盖层.append(
        $('<div style="margin-top: 1rem; text-align: center;"></div>').append($别烦我)
    );
    $整个内容区域.append($覆盖层);

    const 重置 = () => {
        $覆盖层.remove();
        $文章.css({
            height: '',
            overflow: '',
        });
    };

    // 限制高度，添加阴影
    $文章.css({
        height: '500px',
        overflow: 'hidden',
    });

    $验证码.on('click', 重置);
    $别烦我.on('click', () => {
        重置();
        别烦我你耳朵龙吗();
    });
}

function 用户是不是不太好惹() {
    const dismiss = sessionStorage.getItem(常量_把用户放在我心里);
    if (dismiss === 'true') {
        return true;
    }
    return false;
}
function 别烦我你耳朵龙吗() {
    sessionStorage.setItem(常量_把用户放在我心里, 'true');
}

const 现在 = new Date();
const 现在是2025愚人节 = `${现在.getFullYear()}-${(现在.getMonth() + 1).toString().padStart(2, '0')}-${现在.getDate().toString().padStart(2, '0')}` === '2025-04-01';
if (!用户是不是不太好惹() && 现在是2025愚人节) {
    mw.hook('wikipage.content').add(皮一下);
}
