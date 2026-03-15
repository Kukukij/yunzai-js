export class QRCodeGenerator extends plugin {
  constructor() {
    super({
      name: '二维码生成',
      dsc: '生成二维码图片',
      event: 'message',
      priority: 10,
      rule: [{
        reg: '^#二维码(.+)$',
        fnc: 'generateQRCode'
      }]
    })
  }

  async generateQRCode() {
    let c = this.e.msg.replace(/^#二维码/, '').trim()
    if (!c) return this.reply('请输入要生成二维码的内容', true)
    
    try {
      await this.reply(segment.image(`https://api.2dcode.biz/v1/create-qr-code?data=${encodeURIComponent(c)}`), true)
    } catch {
      await this.reply('生成二维码失败，请稍后再试', true)
    }
  }
}