/**
 * Errores de la aplicacion.
 *
 * Cada error sabe que codigo HTTP le corresponde. El manejador central los
 * traduce a la envoltura JSON del contrato de la API, de modo que ningun
 * controlador tenga que construir respuestas de error a mano.
 */

export class ErrorHttp extends Error {
  constructor(
    public readonly estado: number,
    mensaje: string,
    public readonly errores?: Record<string, string[]>,
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

export class NoAutenticado extends ErrorHttp {
  constructor(mensaje = "No autenticado.") {
    super(401, mensaje);
  }
}

export class SinPermiso extends ErrorHttp {
  constructor(mensaje = "No tienes permiso para realizar esta accion.") {
    super(403, mensaje);
  }
}

export class NoEncontrado extends ErrorHttp {
  constructor(mensaje = "El recurso solicitado no existe.") {
    super(404, mensaje);
  }
}

export class Conflicto extends ErrorHttp {
  constructor(mensaje = "La operacion no es valida en el estado actual del recurso.") {
    super(409, mensaje);
  }
}

export class PeticionInvalida extends ErrorHttp {
  constructor(mensaje = "La peticion esta mal formada.") {
    super(400, mensaje);
  }
}

export class DemasiadasSolicitudes extends ErrorHttp {
  constructor(mensaje = "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.") {
    super(429, mensaje);
  }
}

export class ErrorValidacion extends ErrorHttp {
  constructor(errores: Record<string, string[]>, mensaje = "Los datos enviados no son validos.") {
    super(422, mensaje, errores);
  }
}
