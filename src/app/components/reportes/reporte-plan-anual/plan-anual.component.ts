import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { ImplicitAutenticationService } from '../../../services/implicit_autentication.service';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';
import { RequestManager } from '../../../services/requestManager';
import { UserService } from '../../../services/userService';

@Component({
  selector: 'app-plan-anual',
  templateUrl: './plan-anual.component.html',
  styleUrls: ['./plan-anual.component.scss']
})
export class PlanAnualComponent implements OnInit {
  form: FormGroup;
  vigencias: any[] = [];
  unidades: any[] = [];
  auxUnidades: any[] = [];
  unidadVisible: boolean;
  tablaVisible: boolean;
  reporte: any;
  reporte_archivo: any;
  dataSource: MatTableDataSource<any>;
  displayedColumns: string[];
  rol: string = "";
  moduloVisible: boolean = false;
  estados: any[];
  planes: any[] = [];
  evaluacion: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private request: RequestManager,
    private autenticationService: ImplicitAutenticationService,
    private userService: UserService
  ) {
    this.form = this.formBuilder.group({
      vigencia: ['', Validators.required],
      tipoReporte: ['', Validators.required],
      categoria: ['', Validators.required],
      unidad: ['', Validators.required],
      estado: ['', Validators.required],
      plan: ['', Validators.required],
    });
    this.loadVigencias();
    this.loadEstados();
    this.loadPlanes();
    this.unidadVisible = true;
    this.tablaVisible = false;
    this.estados = [];
    this.dataSource = new MatTableDataSource<any>();
    this.displayedColumns = ['vigencia', 'unidad', 'tipoPlan', 'estado'];
    this.getRol();
  }

  getRol() {
    let roles: any = this.autenticationService.getRole();
    if (roles.__zone_symbol__value.find((x:any) => x == 'JEFE_DEPENDENCIA' || x == 'ASISTENTE_DEPENDENCIA')) {
      this.rol = 'JEFE_DEPENDENCIA';
      this.validarUnidad();
    } else if (roles.__zone_symbol__value.find((x:any) => x == 'PLANEACION')) {
      this.rol = 'PLANEACION';
      this.loadUnidades();
    }
  }

  ngOnInit(): void {}

  validarUnidad() {
    var documento: any = this.autenticationService.getDocument();
    this.request.get(environment.TERCEROS_SERVICE, `datos_identificacion/?query=Numero:` + documento.__zone_symbol__value)
      .subscribe((datosInfoTercero: any) => {
        this.request.get(environment.PLANES_MID, `formulacion/vinculacion_tercero/` + datosInfoTercero[0].TerceroId.Id)
          .subscribe((vinculacion: any) => {
            if (vinculacion["Data"] != "") {
              this.request.get(environment.OIKOS_SERVICE, `dependencia_tipo_dependencia?query=DependenciaId:` + vinculacion["Data"]["DependenciaId"]).subscribe((dataUnidad: any) => {
                if (dataUnidad) {
                  this.unidades = [];
                  this.auxUnidades = [];
                  let unidad = dataUnidad[0]["DependenciaId"]
                  unidad["TipoDependencia"] = dataUnidad[0]["TipoDependenciaId"]["Id"]
                  this.unidades.push(unidad);
                  this.auxUnidades.push(unidad);
                  this.form.get('unidad')?.setValue(unidad);
                  this.moduloVisible = true;
                  this.form.get('categoria')?.setValue("planAccion");
                  this.form.get('tipoReporte')?.setValue("unidad");
                  this.form.get('tipoReporte')?.disable();
                }
              })
            } else {
              this.moduloVisible = false;
              Swal.fire({
                title: 'Error en la operación',
                text: `No cuenta con los permisos requeridos para acceder a este módulo`,
                icon: 'warning',
                showConfirmButton: false,
                timer: 4000
              })
            }
          })
      })
  }

  loadData(apiEndpoint: string, query: string, successCallback: (data: any) => void) {
    this.request.get(apiEndpoint, query).subscribe(
      (data: any) => {
        if (data) {
          successCallback(data.Data);
        }
      }, 
      (error) => {
        Swal.fire({
          title: 'Error en la operación',
          text: `No se encontraron datos registrados ${JSON.stringify(error)}`,
          icon: 'warning',
          showConfirmButton: false,
          timer: 2500
        });
      }
    );
  }
  
  loadVigencias() {
    this.loadData(environment.PARAMETROS_SERVICE, `periodo?query=CodigoAbreviacion:VG,activo:true`, (data) => {
      this.vigencias = data;
    });
  }
  
  loadUnidades() {
    this.loadData(environment.PLANES_MID, `formulacion/get_unidades`, (data) => {
      this.unidades = data;
      this.auxUnidades = data;
    });
  }
  
  loadPlanes() {
    this.loadData(environment.PLANES_CRUD, `plan?query=activo:true,formato:true`, (data) => {
      this.planes = data;
    });
  }

  loadEstados() {
    const codigos = ['F_SP', 'PA_SP', 'A_SP']; // Códigos de abreviación de estados(Formulado, Pre Aval y Aval)
    codigos.forEach(codigo => {
      this.request.get(environment.PLANES_CRUD, `estado-plan?query=codigo_abreviacion:${codigo}`).subscribe(
        (data: any) => {
          if (data) {
            this.estados.push(data.Data[0]);
          }
        },
        (error) => {
          Swal.fire({
            title: 'Error en la operación',
            text: `No se encontraron datos registrados ${JSON.stringify(error)}`,
            icon: 'warning',
            showConfirmButton: false,
            timer: 2500
          });
        }
      );
    });
  }

  onKey(target:any) {
    if (target.value === "") {
      this.auxUnidades = this.unidades;
    } else {
      let filter = target.value.toLowerCase();
      this.auxUnidades = this.unidades.filter(option => option.Nombre.toLowerCase().startsWith(filter));
    }
  }

  onChangeT(tipo:any) {
    if (tipo === 'unidad') {
      this.form.get('unidad')?.enable();
      this.unidadVisible = true;
    } else if (tipo === 'general') {
      this.form.get('unidad')?.setValue(null);
      this.form.get('unidad')?.disable();
      this.unidadVisible = false;
    }
  }

  onChangeC(categoria:any) {
    this.evaluacion = false;
    if (categoria == 'necesidades') {
      this.form.get('tipoReporte')?.setValue('general');
      this.form.get('tipoReporte')?.setValue(null);
      this.form.get('tipoReporte')?.disable();
      this.form.get('unidad')?.setValue(null);
      this.form.get('unidad')?.disable();
      this.form.get('estado')?.enable();
      this.unidadVisible = false;
    } else if (categoria == 'evaluacion') {
      if (this.rol == 'PLANEACION') {
        this.form.get('tipoReporte')?.setValue(null);
        this.form.get('tipoReporte')?.disable();
      }
      this.form.get('estado')?.setValue(null);
      this.form.get('estado')?.disable();
      this.evaluacion = true;
    } else {
      if (this.rol == 'PLANEACION') {
        this.form.get('tipoReporte')?.enable();
      }
      this.form.get('unidad')?.enable();
      this.form.get('estado')?.enable();
      this.unidadVisible = true;
    }
  }

  validarReporte() {
    let unidad = this.form.get('unidad')?.value;
    let vigencia = this.form.get('vigencia')?.value;
    let tipoReporte = this.form.get('tipoReporte')?.value;
    let categoria = this.form.get('categoria')?.value;
    let estado = this.form.get('estado')?.value;
    let plan = this.form.get('plan')?.value;
    let body: any = {
      tipo_plan_id: "61639b8c1634adf976ed4b4c",
      vigencia: (vigencia.Id).toString(),
      nombre: plan.nombre
    };
    Swal.fire({
      title: 'Validando reporte',
      timerProgressBar: true,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      },
    })
    if (categoria === 'planAccion') {
      if (tipoReporte === 'unidad') {
        body["unidad_id"] = (unidad.Id).toString();
        body["estado_plan_id"] = estado;
        body["categoria"] = "Plan de acción unidad";
      } else if (tipoReporte === 'general') {
        body["estado_plan_id"] = estado;
        body["categoria"] = "Plan de acción general";
      }
    } else if (categoria === 'necesidades') {
      body["estado_plan_id"] = estado;
      body["categoria"] = "Necesidades";
    } else if (categoria === 'evaluacion') {
      body["unidad_id"] = (unidad.Id).toString();
      body["categoria"] = "Evaluación";
    }

    this.request.post(environment.PLANES_MID, `reportes/validar_reporte`, body).subscribe((res: any) => {
      if (res) {
        if (res.Data.reporte) {
          this.generarReporte();
        } else {
          Swal.fire({
            title: 'No es posible generar un reporte',
            text: res.Data.mensaje,
            icon: 'info',
            showConfirmButton: false,
            timer: 3500
          })
        }
      }
    }, (error) => {
      Swal.fire({
        title: 'Error en la operación',
        text: `No es posible generar el reporte`,
        icon: 'error',
        showConfirmButton: false,
        timer: 2500
      })
    })
  }

  procesarPlanAccionGeneral(formularioData:any) {
    let body = {
      tipo_plan_id: "61639b8c1634adf976ed4b4c",
      estado_plan_id: formularioData.estado,
      vigencia: (formularioData.vigencia.Id).toString(),
    }

    this.request.post(environment.PLANES_MID, `reportes/plan_anual_general/`+ formularioData.plan.nombre, body).subscribe(
      (data: any) => {
        if (data) {
          let infoReportes: any[] = data.Data.generalData;
          this.dataSource.data = [];
          this.reporte_archivo = data.Data["excelB64"];
          for (let i = 0; i < infoReportes.length; i++) {
            infoReportes[i]["vigencia"] = formularioData.vigencia["Nombre"]
            if (i == infoReportes.length - 1) {
              let auxDataSource = this.dataSource.data;
              this.dataSource.data = auxDataSource.concat(infoReportes);
              this.tablaVisible = true
              Swal.close();
            }
          }
        }
      }, (error) => {
        Swal.fire({
          title: 'Error en la operación',
          text: `No se encontraron datos registrados`,
          icon: 'warning',
          showConfirmButton: false,
          timer: 2500
        })
      }
    )
  }

  procesarPlanAccion(formularioData:any){
    let body = {
      unidad_id: (formularioData.unidad.Id).toString(),
      tipo_plan_id: "61639b8c1634adf976ed4b4c",
      estado_plan_id: formularioData.estado,
      vigencia: (formularioData.vigencia.Id).toString(),
    }

    this.request.post(environment.PLANES_MID, `reportes/plan_anual/` + formularioData.plan.nombre.replace(/ /g, "%20"), body).subscribe(
      (data: any) => {
        if (data) {
          if (data.Data.generalData) {
            this.dataSource.data = [];
            let auxEstado = this.estados.find(element => element._id === formularioData.estado);
            this.reporte = body;
            this.reporte_archivo = data.Data.excelB64;
            this.reporte["nombre_unidad"] = data.Data.generalData[0].nombreUnidad;
            this.reporte["vigencia"] = formularioData.vigencia.Nombre
            this.reporte["tipo_plan"] = "Plan de acción de funcionamiento"
            this.reporte["estado_plan"] = auxEstado.nombre
            this.tablaVisible = true;
            let auxDataSource = this.dataSource.data;
            auxDataSource.push(this.reporte)
            this.dataSource.data = auxDataSource;
            Swal.close();
          } else {
            Swal.close();
            Swal.fire({
              title: 'Error en la operación',
              text: `No se encontraron datos registrados para este reporte`,
              icon: 'warning',
              showConfirmButton: false,
              timer: 2500
            })
          }
        }
      }, (error) => {
        Swal.fire({
          title: 'Error en la operación',
          text: `No se encontraron datos registrados`,
          icon: 'warning',
          showConfirmButton: false,
          timer: 2500
        })
      }
    )
  }

  procesarNecesidades(formularioData:any){
    let body = {
      tipo_plan_id: "61639b8c1634adf976ed4b4c",
      estado_plan_id: formularioData.estado,
      vigencia: (formularioData.vigencia.Id).toString(),
    }

    this.request.post(environment.PLANES_MID, `reportes/necesidades/` + formularioData.plan.nombre.replace(/ /g, "%20"), body).subscribe(
      (data: any) => {
        if (data) {
          this.dataSource.data = [];
          let auxEstado = this.estados.find(element => element._id === formularioData.estado);
          this.reporte = body;
          this.reporte_archivo = data.Data["excelB64"];
          this.reporte["nombre_unidad"] = "General";
          this.reporte["vigencia"] = formularioData.vigencia.Nombre;
          this.reporte["tipo_plan"] = "Necesidades";
          this.reporte["estado_plan"] = auxEstado.nombre;
          this.reporte["unidad_id"] = "";
          let auxDataSource = this.dataSource.data;
          auxDataSource.push(this.reporte)
          this.dataSource.data = auxDataSource;
          this.tablaVisible = true;
          Swal.close()
        }
      }, (error) => {
        Swal.fire({
          title: 'Error en la operación',
          text: `No se encontraron datos registrados para realizar el reporte`,
          icon: 'warning',
          showConfirmButton: false,
          timer: 2500
        })
      }
    )
  }

  procesarEvaluacion(formularioData:any) {
    let body = {
      unidad_id: (formularioData.unidad.Id).toString(),
      tipo_plan_id: "61639b8c1634adf976ed4b4c",
      vigencia: (formularioData.vigencia.Id).toString(),
    }

    this.request.post(environment.PLANES_MID, `reportes/plan_anual_evaluacion/` + formularioData.plan.nombre.replace(/ /g, "%20"), body).subscribe(
      (data: any) => {
        if (data) {
          if (data.Data.generalData) {
            this.dataSource.data = [];
            this.reporte = body;
            this.reporte_archivo = data.Data.excelB64;
            this.reporte["nombre_unidad"] = data.Data.generalData[0].nombreUnidad;
            this.reporte["vigencia"] = formularioData.vigencia.Nombre
            this.reporte["tipo_plan"] = "Evaluación plan de acción"
            this.reporte["estado_plan"] = formularioData.plan.nombre;
            this.tablaVisible = true;
            let auxDataSource = this.dataSource.data;
            auxDataSource.push(this.reporte)
            this.dataSource.data = auxDataSource;
            Swal.close();
          } else {
            Swal.close();
            Swal.fire({
              title: 'Error en la operación',
              text: `No se encontraron datos registrados para este reporte`,
              icon: 'warning',
              showConfirmButton: false,
              timer: 2500
            })
          }
        }
      }, (error) => {
        Swal.fire({
          title: 'Error en la operación',
          text: `No se encontraron datos registrados`,
          icon: 'warning',
          showConfirmButton: false,
          timer: 2500
        })
      }
    )
  }

  generarReporte() {
    let tipoReporte = this.form.get('tipoReporte')?.value;
    let categoria = this.form.get('categoria')?.value;
    let formularioData = {
      unidad: this.form.get('unidad')?.value,
      vigencia: this.form.get('vigencia')?.value,
      estado: this.form.get('estado')?.value,
      plan: this.form.get('plan')?.value
    };

    Swal.fire({
      title: 'Generando Reporte',
      timerProgressBar: true,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      },
    })
    if (categoria === 'planAccion') {
      if (tipoReporte === 'unidad') {
        this.procesarPlanAccion(formularioData);
      } else if (tipoReporte === 'general') {
        this.procesarPlanAccionGeneral(formularioData);
      }
    } else if (categoria === 'necesidades') {
      this.procesarNecesidades(formularioData);
    } else if (categoria === 'evaluacion') {
      this.procesarEvaluacion(formularioData);
    }
  }

  descargarReporte() {
    let blob = this.base64ToBlob(this.reporte_archivo);
    let url = window.URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.download = "Reporte.xlsx";
    anchor.href = url;
    anchor.click();
  }

  public base64ToBlob(b64Data:any, sliceSize = 512) {
    let byteCharacters = atob(b64Data); //data.file there
    let byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      let slice = byteCharacters.slice(offset, offset + sliceSize);
      let byteNumbers = new Array(slice.length);
      for (var i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      let byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}
