'use client'

import { EditorPropietarios } from '@/components/admin/EditorPropietarios'

export default function PropietariosPage() {
  // TODO: En el futuro, obtener el conjuntoId del usuario logueado
  // Por ahora, usamos el ID del conjunto creado en el seed
  const conjuntoId = '0e11c11c-39b3-4c18-b593-aee58d213c76' // Lo obtendremos en el siguiente paso

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestión de Propietarios
        </h1>
        <p className="text-gray-600">
          Carga y edita la lista de propietarios del conjunto
        </p>
      </div>

      <EditorPropietarios
        conjuntoId={conjuntoId}
        onGuardadoExitoso={(count) => {
          console.log(` ${count} propietarios guardados`)
        }}
      />
    </div>
  )
}