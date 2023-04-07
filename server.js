const username = process.env.WEB_USERNAME || "admin";
const password = process.env.WEB_PASSWORD || "root";
const url = "https://" + process.env.PROJECT_DOMAIN + ".glitch.me";
const port = process.env.PORT || 3000;
const express = require("express");
const app = express();
var exec = require("child_process").exec;
const os = require("os");
const { createProxyMiddleware } = require("http-proxy-middleware");
var request = require("request");
var fs = require("fs");
var path = require("path");
const auth = require("basic-auth");

app.get("/", function (req, res) {
  res.send("hello world");
});

app.use((req, res, next) => {
  const user = auth(req);
  if (user && user.name === username && user.pass === password) {
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Node"');
  return res.status(401).send();
});

// 获取系统进程表
app.get("/status", function (req, res) {
  let cmdStr =
    "ps -ef";
  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.type("html").send("<pre>命令行执行错误：\n" + err + "</pre>");
    } else {
      res.type("html").send("<pre>获取系统进程表：\n" + stdout + "</pre>");
    }
  });
});

// 获取系统监听端口
app.get("/listen", function (req, res) {
  let cmdStr = "ss -nltp";
  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.type("html").send("<pre>命令行执行错误：\n" + err + "</pre>");
    } else {
      res.type("html").send("<pre>获取系统监听端口：\n" + stdout + "</pre>");
    }
  });
});

//获取节点数据
app.get("/list", function (req, res) {
  let cmdStr = "cat list";
  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.type("html").send("<pre>命令行执行错误：\n" + err + "</pre>");
    } else {
      res.type("html").send("<pre>节点数据：\n\n" + stdout + "</pre>");
    }
  });
});

// 获取系统版本、内存信息
app.get("/info", function (req, res) {
  let cmdStr = "cat /etc/*release | grep -E ^NAME";
  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.send("命令行执行错误：" + err);
    } else {
      res.send(
        "命令行执行结果：\n" +
          "Linux System:" +
          stdout +
          "\nRAM:" +
          os.totalmem() / 1000 / 1000 +
          "MB"
      );
    }
  });
});

// 文件系统只读测试
app.get("/test", function (req, res) {
  fs.writeFile("./test.txt", "这里是新创建的文件内容!", function (err) {
    if (err) {
      res.send("创建文件失败，文件系统权限为只读：" + err);
    } else {
      res.send("创建文件成功，文件系统权限为非只读：");
    }
  });
});

// 启动root
app.get("/root", function (req, res) {
  let cmdStr = "bash root.sh >/dev/null 2>&1 &";
  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.send("root权限部署错误：" + err);
    } else {
      res.send("root权限执行结果：" + "启动成功!");
    }
  });
});

app.use(
  "/",
  createProxyMiddleware({
    changeOrigin: true, // 默认false，是否需要改变原始主机头为目标URL
    onProxyReq: function onProxyReq(proxyReq, req, res) {},
    pathRewrite: {
      // 请求中去除/
      "^/": "/",
    },
    target: "http://127.0.0.1:8080/", // 需要跨域处理的请求地址
    ws: true, // 是否代理websockets
  })
);

//初始化，下载web
function download_web(callback) {
  let fileName = "web.js";
  let web_url =
    "https://github.com/fscarmen2/Argo-X-Container-PaaS/raw/main/web.js";
  let stream = fs.createWriteStream(path.join("./", fileName));
  request(web_url)
    .pipe(stream)
    .on("close", function (err) {
      if (err) {
        callback("下载文件失败");
      } else {
        callback(null);
      }
    });
}

download_web((err) => {
  if (err) {
    console.log("初始化-下载web文件失败");
  } else {
    console.log("初始化-下载web文件成功");
  }
});

// 启动核心脚本运行web,哪吒和argo
exec("bash entrypoint.sh", function (err, stdout, stderr) {
  if (err) {
    console.error(err);
    return;
  }
  console.log(stdout);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
