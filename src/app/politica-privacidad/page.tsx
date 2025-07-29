
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PoliticaPrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inicio</Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Política de Tratamiento de Datos Personales</CardTitle>
            <CardDescription>DAJUSTICIA S.A.S.</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              En cumplimiento de la Ley 1581 de 2012 y sus decretos reglamentarios, DAJUSTICIA S.A.S., identificada con NIT 900.077.205-9, establece la presente Política para el Tratamiento de Datos Personales, con el fin de proteger la información de nuestros clientes, prospectos y usuarios.
            </p>

            <h4>1. Finalidad del Tratamiento de Datos</h4>
            <p>
              Los datos personales recolectados serán utilizados para las siguientes finalidades:
            </p>
            <ul>
              <li>Prestar nuestros servicios de asesoría y representación legal.</li>
              <li>Realizar el análisis de viabilidad de los casos pensionales y laborales.</li>
              <li>Mantener comunicación constante sobre el estado de los procesos y consultas.</li>
              <li>Crear y gestionar su cuenta de usuario en nuestra plataforma digital.</li>
              <li>Enviar comunicaciones informativas, actualizaciones sobre nuestros servicios y noticias relevantes.</li>
              <li>Realizar gestiones administrativas, de facturación y cobro.</li>
              <li>Cumplir con las obligaciones legales y contractuales.</li>
            </ul>

            <h4>2. Derechos del Titular de la Información</h4>
            <p>
              Como titular de sus datos personales, usted tiene derecho a:
            </p>
            <ul>
              <li>Conocer, actualizar y rectificar sus datos personales.</li>
              <li>Solicitar prueba de la autorización otorgada para el tratamiento de datos.</li>
              <li>Ser informado sobre el uso que se le ha dado a sus datos personales.</li>
              <li>Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.</li>
              <li>Revocar la autorización y/o solicitar la supresión del dato cuando no se respeten los principios, derechos y garantías constitucionales y legales.</li>
              <li>Acceder en forma gratuita a sus datos personales que hayan sido objeto de Tratamiento.</li>
            </ul>

            <h4>3. Mecanismos para Ejercer sus Derechos</h4>
            <p>
              Para ejercer sus derechos, puede contactarnos a través del correo electrónico: <strong>director.dajusticia@gmail.com</strong> o en nuestra dirección física: Carrera 46 # 90-17, Oficina 501, Centro Empresarial Distrito 90, Barranquilla.
            </p>

            <h4>4. Vigencia</h4>
            <p>
              La presente política rige a partir de su publicación y deja sin efectos las demás disposiciones institucionales que le sean contrarias. La base de datos se mantendrá vigente durante el tiempo necesario para cumplir con las finalidades mencionadas y con las obligaciones legales.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Minimal styling to avoid full layout import
import { Button } from '@/components/ui/button';
