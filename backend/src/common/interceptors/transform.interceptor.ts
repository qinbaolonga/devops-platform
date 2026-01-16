import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // 如果是 StreamableFile（文件下载），直接返回不包装
        if (data instanceof StreamableFile) {
          return data as any;
        }
        
        // 如果数据已经是标准格式，直接返回
        if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
          return data;
        }
        
        // 否则包装成标准格式
        return {
          code: 200,
          message: 'success',
          data,
        };
      }),
    );
  }
}