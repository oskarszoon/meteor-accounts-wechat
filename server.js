const Base64 = Package.base64.Base64;
const whitelistedFields = [
    'nickname',
    'sex',
    'language',
    'province',
    'city',
    'country',
    'headimgurl',
    'privilege'
];

const serviceName = Wechat.serviceName;
const serviceVersion = 2;
const serviceUrls = null;
const serviceHandler = function (query) {
    var config = ServiceConfiguration.configurations.findOne({service: serviceName});
    if (!config)
        throw new ServiceConfiguration.ConfigError();

    var response = getTokenResponse(config, query);

    const expiresAt = (+new Date) + (1000 * parseInt(response.expiresIn, 10));
    const {appId, accessToken, scope, openId, unionId} = response;
    let serviceData = {
        appId,
        accessToken,
        expiresAt,
        openId,
        unionId,
        scope,
        id: config.mainId === 'unionId' ? unionId : openId // id is required by Meteor
    };

    // only set the token in serviceData if it's there. this ensures
    // that we don't lose old ones
    if (response.refreshToken)
        serviceData.refreshToken = response.refreshToken;

    var identity = getIdentity(accessToken, openId);
    var fields = _.pick(identity, whitelistedFields);
    _.extend(serviceData, fields);

    return {
        serviceData: serviceData,
        options: {
            profile: fields
        }
    };
};

var getTokenResponse = function (config, query) {
    var state;
    try {
        state = JSON.parse(Base64.decode(query.state));
    } catch (err) {
        throw new Error("Failed to decode state in OAuth callback with Wechat: " + query.state);
    }
    var response;
    try {
        //Request an access token
        response = HTTP.get(
            "https://api.weixin.qq.com/sns/oauth2/access_token", {
                params: {
                    code: query.code,
                    appid: state.appId,
                    secret: OAuth.openSecret(state.appId == config.appId ? config.secret : config.mpSecret),
                    grant_type: 'authorization_code'
                }
            }
        );

        if (response.statusCode !== 200 || !response.content)
            throw {message: "HTTP response error", response: response};

        response.content = JSON.parse(response.content);
        if (response.content.errcode)
            throw {message: response.content.errcode + " " + response.content.errmsg, response: response};
    } catch (err) {
        throw _.extend(new Error("Failed to complete OAuth handshake with Wechat. " + err.message),
            {response: err.response});
    }

    return {
        appId: state.appId,
        accessToken: response.content.access_token,
        expiresIn: response.content.expires_in,
        refreshToken: response.content.refresh_token,
        scope: response.content.scope,
        openId: response.content.openid,
        unionId: response.content.unionid
    };
};

var getIdentity = function (accessToken, openId) {
    try {
        var response = HTTP.get("https://api.weixin.qq.com/sns/userinfo", {
                params: {access_token: accessToken, openid: openId, lang: 'zh-CN'}
            }
        );

        if (response.statusCode !== 200 || !response.content)
            throw {message: "HTTP response error", response: response};

        response.content = JSON.parse(response.content);
        if (response.content.errcode)
            throw {message: response.content.errcode + " " + response.content.errmsg, response: response};

        return response.content;
    } catch (err) {
        throw _.extend(new Error("Failed to fetch identity from Wechat. " + err.message),
            {response: err.response});
    }
};

// register OAuth service
OAuth.registerService(serviceName, serviceVersion, serviceUrls, serviceHandler);

// retrieve credential
Wechat.retrieveCredential = function (credentialToken, credentialSecret) {
    return OAuth.retrieveCredential(credentialToken, credentialSecret);
};

Accounts.addAutopublishFields({
    forLoggedInUser: _.map(
        // why not publish openId and unionId?
        whitelistedFields.concat(['accessToken', 'expiresAt']), // don't publish refresh token
        function (subfield) { return 'services.' + serviceName + '.' + subfield; }
    ),

    forOtherUsers: _.map(
        whitelistedFields,
        function (subfield) { return 'services.' + serviceName + '.' + subfield; })
});
