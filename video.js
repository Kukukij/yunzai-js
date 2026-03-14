import fetch from "node-fetch";
import fs from "node:fs";

if (!fs.existsSync(`./resources/video/`)) fs.mkdirSync(`./resources/video/`);

const isonlyAt = true;

export class videojx extends plugin {
  constructor(e) {
    super({
      name: 'videojx',
      dsc: '视频解析',
      event: 'message',
      priority: -114514,
      rule: [{ reg: '', fnc: 'dealUrl', log: false }]
    })
    if (e?.raw_message == '[json消息]' && isonlyAt) this.jsonUrl(e)
    
    this.task = {
      cron: '30 2 * * *',
      name: '定时清理视频',
      fnc: () => {
        const p = './resources/video/';
        if (fs.existsSync(p)) fs.readdirSync(p).forEach(f => fs.unlinkSync(p + f));
      }
    }
  }

  formatLike = like => like >= 10000 ? (like / 10000).toFixed(1) + "万" : like + "个";

  sendForwardMsg = async (e, n, imgs) => {
    const msg = [{ user_id: this.e.bot.uin, nickname: n, message: `本次一共 ${imgs.length} 张图片` }];
    imgs.forEach(u => msg.push({ user_id: this.e.bot.uin, nickname: n, message: segment.image(u) }));
    return e.isGroup ? await e.group.makeForwardMsg(msg) : await e.friend.makeForwardMsg(msg);
  }

  async jsonUrl(e) {
    let url, msg = await JSON.parse(e.msg);
    if (msg.ver == '0.0.0.1' && msg.meta?.news && ['快手','快手极速版'].includes(msg.meta.news.tag)) {
      url = msg.meta.news.jumpUrl; this.kuaishou(e, url); return true;
    }
    if (msg.ver == '1.0.0.19' || msg.ver == '1.0.1.46') {
      if (msg.meta.detail_1.title == '哔哩哔哩') { url = msg.meta.detail_1.qqdocurl; this.bilibili(e, url); return true; }
    } else if (msg.ver == '0.0.0.1' && msg.meta?.video && msg.meta.video.tag == '哔哩哔哩') {
      url = msg.meta.video.jumpUrl; this.bilibili(e, url); return true;
    }
    return false;
  }

  async dealUrl(e) {
    if (!isonlyAt) this.jsonUrl;
    let url, reg = /b23.tv|m.bilibili.com|www.bilibili.com|v.kuaishou.com|www.kuaishou.com|(v\.douyin\.com|douyin\.com)/;
    if (!reg.test(e.msg) || e.message[0].type != 'text') return false;
    try { url = e.msg.match(/(https?|http|ftp|file):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/g)[0]; } catch { return false; }
    if (/v.douyin.com/.test(url)) this.douyin(e, url);
    else if (/v.kuaishou.com|www.kuaishou.com/.test(url)) this.kuaishou(e, url);
    else this.bilibili(e, url);
  }

  async bilibili(e, url) {
    let res = await fetch(url), cs = res.url.indexOf('BV');
    if (cs == -1) return false;
    let bvid = res.url.substring(cs, cs + 12);
    res = await this.tourl(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
    let qn = this.autoQuality(e, res.duration);
    if (qn === null) return false;
    e.reply([
      segment.image(res.pic),
      `作者:${res.owner.name}\n标题:${res.title}\n简介:${res.desc}\n\n点赞:${this.formatLike(res.stat.like)}      收藏:${res.stat.favorite}\n投币:${res.stat.coin}      转发:${res.stat.share}\n正在解析b站视频...`
    ]);
    res = await this.tourl(`https://api.bilibili.com/x/player/playurl?avid=${res.aid}&cid=${res.cid}&qn=${qn}`);
    let response = await fetch(res.durl[0].url, { headers: { 'referer': 'https://www.bilibili.com/', 'User-Agent': 'Mozilla/5.0' } });
    this.buff(e, "bilibili", response);
  }

  async douyin(e, url) {
    try {
      let data = await (await fetch(`http://api.xhus.cn/api/douyin?url=${encodeURIComponent(url)}`)).json();
      if (data.code !== 200) throw new Error();
      let d = data.data, isAlbum = Array.isArray(d.images) && d.images.length > 0;
      if (!d.url && !isAlbum) throw new Error();
      
      let msg = [];
      if (d.avatar) msg.push(segment.image(d.avatar));
      msg.push(`作者: ${d.author}\n抖音号: ${d.uid}\n标题: ${d.title}\n点赞: ${this.formatLike(d.like)}`);
      if (d.cover) msg.push(segment.image(d.cover));
      await e.reply(msg);

      if (isAlbum) {
        let ngm = await this.sendForwardMsg(e, '抖音图集', d.images);
        await this.reply(ngm);
      } else {
        let response = await fetch(d.url);
        await this.buff(e, "douyin", response);
      }
      return true;
    } catch { await e.reply("抖音解析失败"); return false; }
  }

  async kuaishou(e, url) {
    try {
      let data = await (await fetch(`http://api.xhus.cn/api/ksvideo?url=${encodeURIComponent(url)}`)).json();
      if (data.code !== 200) throw new Error();
      let d = data.data, isAlbum = d.type === 'image';
      if (!d.url && !isAlbum) throw new Error();
      
      let msg = [];
      if (d.avatar) msg.push(segment.image(d.avatar));
      msg.push(`作者: ${d.author}\n标题: ${d.title}\n点赞: ${this.formatLike(d.like)}`);
      if (d.cover) msg.push(segment.image(d.cover));
      await e.reply(msg);

      if (isAlbum) {
        let ngm = await this.sendForwardMsg(e, '快手图集', d.images);
        await this.reply(ngm);
      } else {
        let response = await fetch(d.url);
        await this.buff(e, "kuaishou", response);
      }
      return true;
    } catch { await e.reply("快手解析失败"); return false; }
  }

  async tourl(url) { return (await (await fetch(url)).json()).data; }

  async buff(e, ttl, res) {
    let buff = await res.arrayBuffer();
    if (!buff) return e.reply("解析出错");
    fs.writeFile(`./resources/video/${ttl}.mp4`, Buffer.from(buff), "binary", err => 
      err ? e.reply("下载出错") : e.reply(segment.video(`./resources/video/${ttl}.mp4`))
    );
  }

  autoQuality(e, d) {
    if (d >= 600) { e.reply("视频时长超过10分钟，不做解析。"); return null; }
    if (d >= 300) e.reply("视频时长超过5分钟，已将视频画质降低至360p");
    return d >= 300 ? 16 : 80;
  }
}
