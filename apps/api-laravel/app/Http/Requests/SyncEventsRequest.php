<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * SyncEventsRequest — Validación estricta del payload de sincronización.
 *
 * Valida que el body contenga un array `events` donde cada elemento
 * cumple con el contrato de la API (ver api_contract_sync_events.md).
 *
 * Si la validación falla, responde 422 con errores detallados
 * en formato JSON (sin redirigir, ya que es una API stateless).
 */
class SyncEventsRequest extends FormRequest
{
    /**
     * Cualquier usuario autenticado puede sincronizar eventos.
     * La autorización fina (¿este tenant_id le pertenece?) se
     * puede validar aquí o delegarla al middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Reglas de validación estrictas para cada evento del batch.
     */
    public function rules(): array
    {
        return [
            'events'                  => ['required', 'array', 'min:1', 'max:500'],
            'events.*.event_id'       => ['required', 'uuid'],
            'events.*.tenant_id'      => ['required', 'uuid'],
            'events.*.entity_type'    => ['required', 'string', 'in:CUSTOMER,SALE,ITEM,SALE_PAYMENT,EXPENSE'],
            'events.*.action'         => ['required', 'string', 'in:CREATE,UPDATE,DELETE,ADJUST_STOCK,VOID'],
            'events.*.entity_id'      => ['required', 'uuid'],
            'events.*.occurred_at'    => ['required', 'string'],  // ISO 8601 string
            'events.*.payload'        => ['required', 'array'],
        ];
    }

    /**
     * Mensajes de error personalizados en español.
     */
    public function messages(): array
    {
        return [
            'events.required'                  => 'El campo "events" es obligatorio.',
            'events.array'                     => 'El campo "events" debe ser un arreglo.',
            'events.min'                       => 'Debe enviar al menos 1 evento.',
            'events.max'                       => 'No se pueden enviar más de 500 eventos por batch.',
            'events.*.event_id.required'       => 'Cada evento debe tener un event_id.',
            'events.*.event_id.uuid'           => 'El event_id debe ser un UUID válido.',
            'events.*.tenant_id.required'      => 'Cada evento debe tener un tenant_id.',
            'events.*.tenant_id.uuid'          => 'El tenant_id debe ser un UUID válido.',
            'events.*.entity_type.required'    => 'Cada evento debe especificar entity_type.',
            'events.*.entity_type.in'          => 'entity_type debe ser: CUSTOMER, SALE, ITEM, SALE_PAYMENT o EXPENSE.',
            'events.*.action.required'         => 'Cada evento debe especificar una action.',
            'events.*.action.in'               => 'action debe ser: CREATE, UPDATE, DELETE, ADJUST_STOCK o VOID.',
            'events.*.entity_id.required'      => 'Cada evento debe tener un entity_id.',
            'events.*.entity_id.uuid'          => 'El entity_id debe ser un UUID válido.',
            'events.*.occurred_at.required'    => 'Cada evento debe tener occurred_at.',
            'events.*.payload.required'        => 'Cada evento debe incluir un payload.',
            'events.*.payload.array'           => 'El payload debe ser un objeto/arreglo.',
        ];
    }

    /**
     * Override para que los errores de validación se devuelvan como JSON
     * en lugar de una redirección (comportamiento API stateless).
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'status'  => 'error',
                'message' => 'Errores de validación en el payload de sincronización.',
                'errors'  => $validator->errors()->toArray(),
            ], 422)
        );
    }
}
