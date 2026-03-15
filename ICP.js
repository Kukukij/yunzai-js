import fetch from 'node-fetch'

export class IcpQuery extends plugin {
  constructor() {
    super({
      name: 'ICP备案查询',
      dsc: '查询网站ICP备案信息',
      event: 'message',
      priority: 10,
      rule: [{
        reg: /^#?icp查询\s?.+$/i,
        fnc: 'queryIcp'
      }]
    })
  }

  async queryIcp() {
    let input = this.e.msg.replace(/^#?icp查询\s?/i, '').trim()
    if (!input) return this.reply('请输入要查询的域名')

    try {
      let data = await (await fetch(`https://api.suol.cc/v1/icp.php?url=${encodeURIComponent(input)}`)).json()
      
      if (data.code === 201) return this.reply('该域名未进行备案')
      if (data.code !== 200 || !data.icp) return this.reply('查询失败')

      let msg = [{
        user_id: this.e.bot.uin,
        nickname: 'ICP备案查询',
        message: `域名: ${data.url}`
      }]

      Object.entries(data.icp).forEach(([k, v]) => msg.push({
        user_id: this.e.bot.uin,
        nickname: 'ICP备案查询',
        message: `${k}: ${v}`
      }))

      let ngm = this.e.isGroup ? 
        await this.e.group.makeForwardMsg(msg) : 
        await this.e.friend.makeForwardMsg(msg)

      if (ngm.data?.meta?.detail) ngm.data.meta.detail = {
        news: [{ text: 'ICP查询结果' }],
        source: 'ICP备案查询',
        summary: 'ICP查询',
        preview: ''
      }
      
      if (ngm.data?.prompt) ngm.data.prompt = 'ICP查询结果'

      await this.reply(ngm)
    } catch {
      await this.reply('查询出错，请稍后再试')
    }
  }
}