import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Documento } from '../models/documento';
import { RequestManager } from '../../pages/services/requestManager';
import { DomSanitizer } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { rejects } from 'assert';

@Injectable({
  providedIn: 'root',
})
export class GestorDocumentalService {
  constructor(
    private anyService: RequestManager,
    private sanitization: DomSanitizer
  ) {}

  getUrlFile(base64, minetype) {
    return new Promise<string>((resolve, reject) => {
      const url = `data:${minetype};base64,${base64}`;
      fetch(url)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], 'File name', { type: minetype });
          const url = URL.createObjectURL(file);
          resolve(url);
        });
    });
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
        if (encoded.length % 4 > 0) {
          encoded += '='.repeat(4 - (encoded.length % 4));
        }
        resolve(encoded);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  uploadFiles(files) {
    const documentsSubject = new Subject<Documento[]>();
    const documents$ = documentsSubject.asObservable();

    const documentos = [];

    files.map(async (file) => {
      const sendFileData = [
        {
          IdTipoDocumento: file.IdDocumento,
          nombre: file.nombre,
          metadatos: file.metadatos ? file.metadatos : {},
          descripcion: file.descripcion ? file.descripcion : '',
          file: await this.fileToBase64(file.file),
        },
      ];

      this.anyService
        .post(
          environment.GESTOR_DOCUMENTAL_MID,
          'document/upload',
          sendFileData
        )
        .subscribe((dataResponse) => {
          documentos.push(dataResponse);
          if (documentos.length === files.length) {
            documentsSubject.next(documentos);
          }
        });
    });

    return documents$;
  }

  get(files) {
    const documentsSubject = new Subject<Documento[]>();
    const documents$ = documentsSubject.asObservable();
    const documentos = files;
    let i = 0;
    files.map((file, index) => {
      this.anyService
        .get(environment.DOCUMENTO_SERVICE, 'documento/' + file.Id)
        .subscribe(
          (doc) => {
            this.anyService
              .get(environment.GESTOR_DOCUMENTAL_MID, 'document/' + doc.Enlace)
              .subscribe(
                async (f: any) => {
                  const url = await this.getUrlFile(
                    f.file,
                    f['file:content']['mime-type']
                  );
                  documentos[index] = {
                    ...documentos[index],
                    ...{ url: url },
                    ...{
                      Documento: this.sanitization.bypassSecurityTrustUrl(url),
                    },
                  };
                  i += 1;
                  if (i === files.length) {
                    documentsSubject.next(documentos);
                  }
                },
                (error) => {
                  rejects(error);
                }
              );
          },
          (error) => {
            rejects(error);
          }
        );
    });
    return documents$;
  }

  getByUUID(uuid) {
    const documentsSubject = new Subject<Documento[]>();
    const documents$ = documentsSubject.asObservable();
    let documento = null;
    this.anyService
      .get(environment.GESTOR_DOCUMENTAL_MID, 'document/' + uuid)
      .subscribe(
        async (f: any) => {
          const url = await this.getUrlFile(
            f.file,
            f['file:content']['mime-type']
          );
          documento = url;
          documentsSubject.next(documento);
        },
        (error) => {
          documentsSubject.next(error);
        }
      );
    return documents$;
  }
}
