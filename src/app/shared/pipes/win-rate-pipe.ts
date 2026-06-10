import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'winRate',
})
export class WinRatePipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }
}
