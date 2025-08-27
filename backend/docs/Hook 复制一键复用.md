from playwright.sync_api import sync_playwright
import time

URL = "https://www.zhipin.com/web/geek/resume?..."   # 登录后的简历页

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto(URL)
    page.wait_for_load_state("networkidle")

    # 1. 切到 iframe
    frame = page.frame_locator('iframe[src*="c-resume"]').first
    canvas = frame.locator("canvas#resume")
    canvas.wait_for()

    # 2. 注入 Hook（剪贴板写操作 & copy 事件）
    frame.evaluate(
        """
        // Hook navigator.clipboard.writeText
        const _writeText = navigator.clipboard.writeText;
        navigator.clipboard.writeText = function (txt) {
            window.__grabbed_text = txt;
            return _writeText.call(this, txt);
        };

        // Hook document.execCommand('copy') / copy 事件
        document.addEventListener('copy', e => {
            window.__grabbed_text = window.getSelection().toString();
        }, true);
        """
    )

    # 3. 拖拽选区（覆盖整张画布）
    box = canvas.bounding_box()
    sx, sy = box["x"] + 5, box["y"] + 5
    ex, ey = box["x"] + box["width"] - 5, box["y"] + box["height"] - 5

    page.mouse.move(sx, sy)
    page.mouse.down()
    page.mouse.move(ex, ey, steps=40)
    page.mouse.up()

    # 4. 触发复制
    page.keyboard.press("Control+C")
    time.sleep(0.5)  # 等剪贴板写入

    # 5. 读取 Hook 到的文本
    text = frame.evaluate("window.__grabbed_text")
    print("--- 简历原文 ---")
    print(text)

    browser.close()