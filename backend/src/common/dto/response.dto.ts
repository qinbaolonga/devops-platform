import { ApiProperty } from '@nestjs/swagger';

export class ResponseDto<T = any> {
  @ApiProperty({ description: '状态码' })
  code: number;

  @ApiProperty({ description: '消息' })
  message: string;

  @ApiProperty({ description: '数据' })
  data?: T;

  @ApiProperty({ description: '时间戳' })
  timestamp: string;

  constructor(code: number, message: string, data?: T) {
    this.code = code;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data?: T, message = '操作成功'): ResponseDto<T> {
    return new ResponseDto(200, message, data);
  }

  static error(message = '操作失败', code = 500): ResponseDto {
    return new ResponseDto(code, message);
  }
}
