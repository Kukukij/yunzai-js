// 原作者🦶佬😭
import fetch from "node-fetch";
import fs from "node:fs";

if (!fs.existsSync(`./resources/video/`)) {
  fs.mkdirSync(`./resources/video/`);
}

//是否在开启仅艾特的群响应小程序转发解析
const isonlyAt = true;

/**
 * 支持视频解析：
 * 哔哩哔哩(链接、小程序转发[两种格式])
 * QQ小世界(暂不支持)
 * 快手(极速版?)(链接、小程序)
 * 抖音链接
 * */
export class videojx extends plugin {
  constructor(e) {
    super({
      name: 'videojx',
      dsc: '视频解析(小程序&链接)',
      event: 'message',
      priority: -114514,
      rule: [{
        reg: '',
        fnc: 'dealUrl',
        log: false
      }]
    })
    if (e?.raw_message == '[json消息]' && isonlyAt)
      this.jsonUrl(e)
  }

  //处理json转url
  async jsonUrl(e) {
    let url;
    let msg = await JSON.parse(e.msg);
    if (msg.ver == '0.0.0.1' && msg.meta?.news) {
      const tag = msg.meta.news.tag;
      if (tag === '快手' || tag === '快手极速版') {
        url = msg.meta.news.jumpUrl;
        this.kuaishou(e, url);
        return true;
      }
    }
    if (msg.ver == '1.0.0.19' || msg.ver == '1.0.1.46') {
      url = msg.meta.detail_1.qqdocurl;
      if (msg.meta.detail_1.title == '哔哩哔哩') {
        this.bilibili(e, url);
        return true;
      }
    } else if (msg.ver == '0.0.0.1' && msg.meta?.video) {
      if (msg.meta.video.tag == '哔哩哔哩') {
        url = msg.meta.video.jumpUrl;
        this.bilibili(e, url);
        return true;
      }
    }
    return false;
  }

  //处理消息转url
  async dealUrl(e) {
    if (!isonlyAt) this.jsonUrl;
    let url;
    let reg = RegExp(/b23.tv|m.bilibili.com|www.bilibili.com|v.kuaishou.com|www.kuaishou.com|(v\.douyin\.com|douyin\.com)/);
    if (!reg.test(e.msg)) return false;
    if (e.message[0].type != 'text') return true;
    reg = /(https?|http|ftp|file):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/g;
    try {
      url = (e.msg.match(reg))[0];
    } catch (error) {
      return false;
    }
    if (RegExp(/v.douyin.com/).test(url)) {
      this.douyin(e, url);
    } else if (RegExp(/v.kuaishou.com|www.kuaishou.com/).test(url)) {
      this.kuaishou(e, url);
    } else {
      this.bilibili(e, url);
    }
  }

  // 哔哩哔哩解析(部分代码来自earth-k-plugin)
  async bilibili(e, url) {
    let res = await fetch(url);
    let cs = res.url.indexOf('BV');
    if (cs == -1) return false;
    let bvid = res.url.substring(cs, cs + 12);
    url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    res = await this.tourl(url);
    logger.info("[视频解析]-哔哩哔哩");
    let qn = this.autoQuality(e, res.duration);
    if (qn === null) {
      return false;
    }
    e.reply([
      segment.image(res.pic),
      `作者:${res.owner.name}\n标题:${res.title}\n简介:${res.desc}\n\n点赞:${res.stat.like}      收藏:${res.stat.favorite}\n投币:${res.stat.coin}      转发:${res.stat.share}\n正在解析b站视频，请等待......`
    ]);
    url = `https://api.bilibili.com/x/player/playurl?avid=${res.aid}&cid=${res.cid}&qn=${qn}`;
    res = await this.tourl(url);
    url = res.durl[0].url;
    let response = await fetch(url, {
      headers: {
        'referer': 'https://www.bilibili.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36'
      }
    });
    this.buff(e, "bilibili", response);
  }

  //抖音解析
  async douyin(e, url) {
    try {
      logger.info("[视频解析]-开始解析抖音URL");

      // 调用API
      let apiUrl = `http://api.xhus.cn/api/douyin?url=${encodeURIComponent(url)}`;
      let res = await fetch(apiUrl);

      if (!res.ok) {
        throw new Error(`API请求失败，状态码: ${res.status}`);
      }

      let data = await res.json();

      // 检查API返回状态
      if (data.code !== 200) {
        throw new Error(data.msg || 'API返回错误');
      }

      const videoData = data.data;

      const author = videoData.author || "未知作者";
      const uid = videoData.uid || "未知";
      const title = videoData.title || "无描述";
      const like = videoData.like || 0;
      const cover = videoData.cover;
      const avatar = videoData.avatar;
      const videoUrl = videoData.url;

      if (!videoUrl) {
        throw new Error('未获取到视频地址');
      }

      logger.info("[视频解析]-抖音[视频]");
      let msg = [];

      // 发送作者头像
      if (avatar) {
        msg.push(segment.image(avatar));
      }

      // 格式化点赞数
      let likeStr = "";
      if (like >= 10000) {
        likeStr = (like / 10000).toFixed(1) + "万";
      } else {
        likeStr = like + "个";
      }

      msg.push(
        `作者: ${author}\n` +
        `抖音号: ${uid}\n` +
        `标题: ${title}\n` +
        `点赞: ${likeStr}`
      );

      // 发送视频封面
      if (cover) {
        msg.push(segment.image(cover));
      }

      await e.reply(msg);

      let response = await fetch(videoUrl);
      await this.buff(e, "douyin", response);
      return true;

    } catch (err) {
      logger.error("[视频解析]-抖音解析失败:", err);

      await e.reply("抖音解析失败，请稍后再试");
      return false;
    }
  }

  //快手解析
  async kuaishou(e, url) {
    try {
      logger.info("[视频解析]-开始解析快手URL");

      // 调用API
      let apiUrl = `http://api.xhus.cn/api/ksvideo?url=${encodeURIComponent(url)}`;
      let res = await fetch(apiUrl);

      if (!res.ok) {
        throw new Error(`API请求失败，状态码: ${res.status}`);
      }

      let data = await res.json();

      // 检查API返回状态
      if (data.code !== 200) {
        throw new Error(data.msg || 'API返回错误');
      }

      const videoData = data.data;
      const author = videoData.author || "未知作者";
      const title = videoData.title || "无描述";
      const like = videoData.like || 0;
      const cover = videoData.cover;
      const avatar = videoData.avatar;
      const videoUrl = videoData.url;

      if (!videoUrl) {
        throw new Error('未获取到视频地址');
      }

      logger.info("[视频解析]-快手[视频]");
      let msg = [];

      // 发送作者头像
      if (avatar) {
        msg.push(segment.image(avatar));
      }

      // 格式化点赞数
      let likeStr = "";
      if (like >= 10000) {
        likeStr = (like / 10000).toFixed(1) + "万";
      } else {
        likeStr = like + "个";
      }

      msg.push(
        `作者: ${author}\n` +
        `标题: ${title}\n` +
        `点赞: ${likeStr}`
      );

      // 发送视频封面
      if (cover) {
        msg.push(segment.image(cover));
      }

      await e.reply(msg);

      let response = await fetch(videoUrl);
      await this.buff(e, "kuaishou", response);
      return true;

    } catch (err) {
      logger.error("[视频解析]-快手解析失败:", err);

      await e.reply("快手解析失败，请稍后再试");
      return false;
    }
  }

  //url统一处理方法
  async tourl(url) {
    let res = await fetch(url);
    res = await res.json();
    res = res.data;
    return res;
  }

  //保存视频统一处理
  async buff(e, ttl, response) {
    let buff = await response.arrayBuffer();
    if (buff) {
      fs.writeFile(`./resources/video/${ttl}.mp4`, Buffer.from(buff), "binary", function(err) {
        if (!err) {
          e.reply(segment.video(`./resources/video/${ttl}.mp4`));
        } else {
          e.reply("下载/发送视频出错");
        }
      });
    } else {
      e.reply("解析出错");
    }
    return true;
  }

  //哔站视频自动选择视频画质
  autoQuality(e, duration) {
    let qn = 80;
    if (duration >= 600) {
      e.reply("视频时长超过10分钟，不做解析。");
      return null;
    } else if (duration >= 300) {
      e.reply("视频时长超过5分钟，已将视频画质降低至360p");
      qn = 16;
    }
    return qn;
  }
}