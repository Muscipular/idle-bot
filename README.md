idle-bot
========

1. 安装[nodejs](http://nodejs.org/download/)

2. 打开命令行(cmd.exe) 进入 脚本所在目录

2. 执行 ```npm u```

3. 将```config-template.json```重命名为```config.json```，并根据实际修改配置

4. 执行 ```node app.js```

配置内容
```javascript
{
    "email": "",        //登陆邮箱
    "password": "",     //密码
    "index": 0,         //序号 0 , 1 , 2对应第 1 , 2 , 3号角色
    "fast": true,       //快速战斗
    "server": "1"       //”1“为1服 ，”2“为2服
}
```

