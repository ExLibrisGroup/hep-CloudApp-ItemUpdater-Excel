import { Injectable } from '@angular/core';
import { CloudAppRestService, HttpMethod, RestErrorResponse } from '@exlibris/exl-cloudapp-angular-lib';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ItemService {

  constructor(
    private restService: CloudAppRestService

  ) { }

  processUser(item: any) {
    let url= item.mms_id && item.holding_id && item.item_pid  ? `/bibs/${item.mms_id}/holdings/${item.holding_id}/items/${item.item_pid}` : `/items?item_barcode=${item.barcode}`;
        return this.restService.call(url).pipe(
          catchError(e=>{
              throw(e);
            }
          ),
          switchMap(original=>{
            if (original==null) {
              return this.restService.call({
                url: '/users',
                method: HttpMethod.POST,
                requestBody: item
              });
            } else {
              console.log(original['link']);
              Object.keys(item).forEach(function(key){
                if(key.startsWith('barcode_') ){
                  //change barcodes - Excel has more than 1 column with barcode title
                  item['barcode'] = item[key] ;
                  key = 'barcode';
                }
                console.log(key + ' - ' + item[key]);
                if(['mms_id','holding_id','item_pid'].includes(key)){
                  console.log(key + ' - ' + item[key] + ' - Not Updating ids' );
                }
                else if(key in original['holding_data']){
                  if(typeof  original['holding_data'][key] !== "string"){
                    original['holding_data'][key]['value'] = item[key]
                  }else{
                    original['holding_data'][key]=item[key];
                  }
                }else if(key in original['item_data']){
                  if(original['item_data'][key] && typeof original['item_data'][key] === "object"){
                    original['item_data'][key]['value'] = item[key]
                  }else{
                    original['item_data'][key]=item[key];
                  }
                }else{
                  original['item_data'][key]=item[key];
                }
            });
              url= original['link'] ? original['link'].substring(original['link'].indexOf("/almaws/v1/")+10 ): url;
              return this.restService.call({
                url: url,
                method: HttpMethod.PUT,
                requestBody: original
              })
            }
          }),
          catchError(e=>of(this.handleError(e, item)))
        )
      

  }
  private handleError(e: RestErrorResponse, item: any) {
    const props = item.barcode ? item.barcode : ['mms_id', 'holding_id', 'item_pid'].map(p=>item[p]).join(', ');
    if (item) {
      e.message = e.message + ` (${props})`
    }
    return e;
  }

  
}