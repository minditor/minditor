const fpsPanel = document.createElement("div");
fpsPanel.setAttribute("id", "fps");
fpsPanel.style.position = "fixed";
fpsPanel.style.right = "3px";
fpsPanel.style.top = "3px";
fpsPanel.style.color = "red";
fpsPanel.style.background = "black";
fpsPanel.style.display = "inline-block";
fpsPanel.style.zIndex = 10000;
// 将面板插入到 body
document.body.append(fpsPanel);
// fps 监测逻辑实现
(function () {
  const requestAnimationFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 60);
    };
  let e, pe, pid, fps, last, offset, step, appendFps;

  fps = 0;
  last = Date.now();
  step = function () {
    offset = Date.now() - last;
    fps += 1;
    if (offset >= 1000) {
      last += offset;
      appendFps(fps);
      fps = 0;
    }
    requestAnimationFrame(step);
  };
  appendFps = function (fps) {
    // 打印 fps
    // console.log(fps + "FPS");
    // 修改面板显示的值
    fpsPanel.innerHTML = fps + "FPS";
  };
  step();
})();
