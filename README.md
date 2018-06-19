# zhaoyao91:accounts-wechat
Meteor accounts package for wechat.
Because this package is generally used in China, this doc will be written in chinese.

## 简介
- 使Meteor应用支持微**微信开放平台**登录
- 支持绑定**微信公众平台**登录
- 若需支持**微信公众平台**登录，请查看[https://github.com/zhaoyao91/meteor-accounts-wechat-mp](https://github.com/zhaoyao91/meteor-accounts-wechat-mp)
- 请自行了解微信开放平台和公众平台的关系和区别

## 用法

### 1. 添加包
```
meteor add ulion:accounts-wechat
meteor add service-configuration
```

### 2. 配置
server端：
```
ServiceConfiguration.configurations.upsert({
    service: Wechat.serviceName // 可以通过Meteor.settings.public.wechatServiceName来修改这个值
}, {
    $set: {
        appId: '...',
        secret: '...',
        scope: 'snsapi_login',
        mainId: 'openId'
    }
});
```

### 3. 登录
client端：
```
Meteor.loginWithWechat(function(err, res){
   ...
})
```

### Note
微信开放平台相关应用的授权回调域、对应Meteor应用的ROOT_URL以及用户访问该应用的实际url必须保持一致。

## 参考
- [boxfish/meteor-accounts-wechat](https://github.com/boxfish/meteor-accounts-wechat/)
- [boxfish/meteor-wechat](https://github.com/boxfish/meteor-wechat/)
