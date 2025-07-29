
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Scale, Shield, Landmark, Briefcase, HeartHandshake, Building, Users, MessageCircle, Mail, Phone, MapPin, Facebook, Twitter, Instagram, FileText } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';


const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
    {children}
  </a>
);

export default function LandingPage() {
  return (
    <div className="bg-[#F9FAFB] text-gray-800 font-body">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-white text-2xl font-headline flex items-center gap-2">
            <Scale />
            <span>Dajusticia</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <NavLink href="#servicios">Servicios</NavLink>
            <NavLink href="#nosotros">Nosotros</NavLink>
            <NavLink href="#contacto">Contacto</NavLink>
          </nav>
          <Button asChild variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-black">
            <Link href="/login">Acceder</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-cover bg-center h-[70vh] md:h-screen flex items-center text-white" style={{ backgroundImage: "url('https://placehold.co/1920x1080/1b4d3e/000000.png?text=.')", backgroundColor: '#1B4D3E' }}>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="container mx-auto text-center relative z-10 px-4">
          <p className="font-semibold text-gold-400 text-sm uppercase tracking-widest">Asesoría Legal Experta en Pensiones</p>
          <h1 className="text-4xl md:text-6xl font-headline mt-2 mb-4">Expertos en derecho laboral y seguridad social</h1>
          <p className="max-w-2xl mx-auto text-gray-300 mb-8">
            Aseguramos el futuro que mereces. Analizamos tu caso pensional y laboral para garantizar que recibas lo justo. Consulta tu caso gratis.
          </p>
          <Button size="lg" className="bg-[#D4AF37] text-black hover:bg-[#B8860B]">
            Mira tu caso ahora
          </Button>
        </div>
      </section>

      {/* Trust Section */}
      <section id="nosotros" className="py-16 md:py-24">
        <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center px-4">
          <div className="grid grid-cols-2 gap-4">
            <Image src="https://placehold.co/300x450.png" alt="Ancianos felices" width={300} height={450} className="rounded-lg shadow-lg object-cover w-full h-full col-span-2" data-ai-hint="happy elderly couple" />
            <Image src="https://placehold.co/300x220.png" alt="Apretón de manos" width={300} height={220} className="rounded-lg shadow-lg object-cover w-full h-full" data-ai-hint="handshake business" />
            <Image src="https://placehold.co/300x220.png" alt="Reunión de abogados" width={300} height={220} className="rounded-lg shadow-lg object-cover w-full h-full" data-ai-hint="lawyers meeting" />
          </div>
          <div>
            <p className="text-[#1B4D3E] font-semibold uppercase text-sm">Nuestra Firma</p>
            <h2 className="text-3xl md:text-4xl font-headline mt-2 mb-6 text-[#1B4D3E]">¿Por Qué Confiar en Dajusticia?</h2>
            <ul className="space-y-4 text-gray-600">
              <li className="flex items-start"><CheckCircle className="h-5 w-5 text-[#D4AF37] mr-3 mt-1 shrink-0" /><span>Más de 20 años de experiencia en casos pensionales.</span></li>
              <li className="flex items-start"><CheckCircle className="h-5 w-5 text-[#D4AF37] mr-3 mt-1 shrink-0" /><span>Acompañamiento personalizado para cada uno de nuestros clientes.</span></li>
              <li className="flex items-start"><CheckCircle className="h-5 w-5 text-[#D4AF37] mr-3 mt-1 shrink-0" /><span>Somos líderes en demandas a Colpensiones y fondos privados.</span></li>
              <li className="flex items-start"><CheckCircle className="h-5 w-5 text-[#D4AF37] mr-3 mt-1 shrink-0" /><span>Contamos con un alto porcentaje de casos de éxito para nuestros clientes.</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 md:py-24 bg-[#FFF8E7]">
        <div className="container mx-auto text-center px-4">
          <p className="text-[#B8860B] font-semibold uppercase text-sm">Análisis de Casos Pensionales</p>
          <h2 className="text-3xl md:text-4xl font-headline mt-2 mb-12 text-[#1B4D3E]">Recibimos Tu Caso Y Lo Analizamos</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="inline-block bg-[#D4AF37]/20 p-4 rounded-full mb-4"><FileText className="h-8 w-8 text-[#B8860B]" /></div>
              <h3 className="font-headline text-xl text-[#1B4D3E]">Consulta Inicial Gratuita</h3>
              <p className="text-gray-600 mt-2">Agendamos una cita inicial donde nos cuentas tu caso y analizamos los documentos para darte una opinión de nuestro equipo de expertos.</p>
            </div>
            <div className="text-center">
              <div className="inline-block bg-[#D4AF37]/20 p-4 rounded-full mb-4"><CheckCircle className="h-8 w-8 text-[#B8860B]" /></div>
              <h3 className="font-headline text-xl text-[#1B4D3E]">Evaluación de Viabilidad</h3>
              <p className="text-gray-600 mt-2">Con un estudio detallado, nuestro equipo evalúa si es viable iniciar la reclamación, el potencial de la misma y los honorarios.</p>
            </div>
            <div className="text-center">
              <div className="inline-block bg-[#D4AF37]/20 p-4 rounded-full mb-4"><Scale className="h-8 w-8 text-[#B8860B]" /></div>
              <h3 className="font-headline text-xl text-[#1B4D3E]">Estrategia y Representación Legal</h3>
              <p className="text-gray-600 mt-2">Desarrollamos un plan de acción y una representación legal exitosa para lograr el mejor resultado posible para tu pensión.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-[#BFA16A] text-[#1B4D3E]">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 py-12 text-center">
          <div><p className="text-4xl font-bold">20+</p><p className="text-sm">AÑOS DE EXPERIENCIA</p></div>
          <div><p className="text-4xl font-bold">500+</p><p className="text-sm">CASOS DE PENSIÓN EXITOSOS</p></div>
          <div><p className="text-4xl font-bold">98%</p><p className="text-sm">SATISFACCIÓN DEL CLIENTE</p></div>
          <div><p className="text-4xl font-bold">10M+</p><p className="text-sm">RECUPERADOS PARA CLIENTES</p></div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-16 md:py-24">
        <div className="container mx-auto text-center px-4">
          <p className="text-[#1B4D3E] font-semibold uppercase text-sm">Nuestras Áreas</p>
          <h2 className="text-3xl md:text-4xl font-headline mt-2 mb-4 text-[#1B4D3E]">Servicios Legales Que Ofrecemos</h2>
          <p className="max-w-3xl mx-auto text-gray-600 mb-12">
            En Dajusticia creemos que los clientes pensionales, laborales y civiles merecen una representación legal completa, en casos fundamentales para su tranquilidad y futuro. Por ello, hemos consolidado un modelo de servicio estructurado, atendido por diferentes áreas y equipos especializados, integrales, sinérgicos y convergentes.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ServiceCard icon={<Scale />} title="Reajuste Pensional" description="Reclamamos la falta de indexación pensional y la reliquidación de la mesada para lograr un monto justo y generoso." />
            <ServiceCard icon={<Landmark />} title="Pensión de Vejez" description="Te asesoramos en el cumplimiento de requisitos para tu retiro laboral y hacemos los trámites con Colpensiones, UGPP o fondos." />
            <ServiceCard icon={<Shield />} title="Pensión de Invalidez" description="Te representamos para que obtengas el reconocimiento y pago de tu derecho por pérdida de capacidad laboral." />
            <ServiceCard icon={<Users />} title="Pensión de Sobrevivientes" description="Asesoramos a los beneficiarios a reclamar la pensión que por ley dejó un cotizante o un pensionado al momento de su deceso." />
            <ServiceCard icon={<Briefcase />} title="Derecho Laboral" description="Te apoyamos en casos de acoso, despidos, agotamiento y reclamación de derechos laborales." />
            <ServiceCard icon={<HeartHandshake />} title="Consultoría Empresarial" description="Brindamos soporte legal para que tu empresa se mantenga al día con todas las normativas." />
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 md:py-24 bg-[#1B4D3E] text-white">
        <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center px-4">
          <div>
            <p className="text-[#D4AF37] font-semibold uppercase text-sm">Nuestro Equipo</p>
            <h2 className="text-3xl md:text-4xl font-headline mt-2 mb-6">Abogados Dedicados. Resultados Comprobados</h2>
            <p className="text-gray-300 mb-8">Conoce a los profesionales que lucharán por tus derechos.</p>
            <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-[#1B4D3E]">
              Conócenos
            </Button>
          </div>
          <div className="flex justify-center md:justify-end space-x-6">
            <div className="text-center">
              <Image src="https://placehold.co/280x320.png" alt="Abogado 1" width={280} height={320} className="rounded-lg shadow-lg mb-2" data-ai-hint="lawyer portrait" />
              <p className="font-semibold">Dr. Robinson Rada Gonzalez</p>
            </div>
            <div className="text-center hidden sm:block">
              <Image src="https://placehold.co/280x320.png" alt="Abogado 2" width={280} height={320} className="rounded-lg shadow-lg mb-2" data-ai-hint="lawyer portrait" />
              <p className="font-semibold">Fabian Muñoz Puello</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto text-center px-4">
          <p className="text-[#1B4D3E] font-semibold uppercase text-sm">Confianza</p>
          <h2 className="text-3xl md:text-4xl font-headline mt-2 mb-12 text-[#1B4D3E]">Qué Dicen Nuestros Clientes</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <TestimonialCard name="Carlos Vargas" quote="El equipo de Dajusticia me brindó un acompañamiento excepcional durante todo mi proceso de reajuste pensional. Lograron lo que parecía imposible. ¡Totalmente recomendados!" />
            <TestimonialCard name="Rosalba Franco" quote="Estaba perdida con mi trámite de pensión de sobreviviente. Gracias a Dajusticia, hoy tengo la tranquilidad que mi esposo quería para mí. Fueron muy humanos y profesionales." />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className="py-16 md:py-24 bg-[#1B4D3E]">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto p-8">
            <div className="text-center">
              <p className="text-[#B8860B] font-semibold uppercase text-sm">Haga su caso</p>
              <h2 className="text-3xl md:text-4xl font-headline mt-2 mb-6 text-[#1B4D3E]">Ingrese Sus Datos Y Te Contactaremos</h2>
            </div>
            <form className="grid md:grid-cols-2 gap-6 mt-8">
              <Input placeholder="Nombre Completo" className="bg-gray-100" />
              <Input placeholder="Correo Electrónico" type="email" className="bg-gray-100" />
              <Input placeholder="Teléfono / Celular" className="bg-gray-100" />
              <Input placeholder="Asunto" className="bg-gray-100" />
              <Textarea placeholder="Describa su caso" className="md:col-span-2 bg-gray-100" rows={5} />
              <div className="md:col-span-2 text-center">
                <Button size="lg" className="bg-[#1B4D3E] text-white hover:bg-[#0F766E]">Enviar Mensaje</Button>
              </div>
            </form>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A192F] text-gray-400 py-12">
        <div className="container mx-auto grid md:grid-cols-4 gap-8 px-4">
          <div>
            <h3 className="font-headline text-lg text-white mb-4">Dajusticia</h3>
            <p className="text-sm">Expertos en derecho laboral y seguridad social, dedicados a asegurar su futuro.</p>
            <div className="flex space-x-4 mt-4">
              <Facebook className="h-5 w-5 hover:text-white" />
              <Twitter className="h-5 w-5 hover:text-white" />
              <Instagram className="h-5 w-5 hover:text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-headline text-lg text-white mb-4">Enlaces</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#servicios" className="hover:text-white">Servicios</a></li>
              <li><a href="#nosotros" className="hover:text-white">Nosotros</a></li>
              <li><a href="#contacto" className="hover:text-white">Contacto</a></li>
              <li><a href="/login" className="hover:text-white">Acceder</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-headline text-lg text-white mb-4">Contacto</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start"><MapPin className="h-4 w-4 mr-2 mt-1 shrink-0" /><span>Carrera 46 # 90-17, Oficina 501, Centro Empresarial Distrito 90, Barranquilla.</span></li>
              <li className="flex items-start"><Phone className="h-4 w-4 mr-2 mt-1 shrink-0" /><span>300-805 93 24</span></li>
              <li className="flex items-start"><Mail className="h-4 w-4 mr-2 mt-1 shrink-0" /><span>director.dajusticia@gmail.com</span></li>
            </ul>
          </div>
          <div>
            <h3 className="font-headline text-lg text-white mb-4">Boletín</h3>
            <p className="text-sm mb-4">Reciba las últimas noticias y actualizaciones de su caso en su correo.</p>
            <div className="flex">
              <Input placeholder="Su correo" className="bg-gray-800 border-gray-600 rounded-r-none" />
              <Button className="bg-[#D4AF37] text-black rounded-l-none hover:bg-[#B8860B]">OK</Button>
            </div>
          </div>
        </div>
        <div className="container mx-auto text-center border-t border-gray-800 mt-8 pt-6 text-xs">
          <p>© {new Date().getFullYear()} Dajusticia. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

const ServiceCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="p-6 bg-white rounded-lg shadow-md text-left transition-transform hover:-translate-y-2">
    <div className="text-[#B8860B] mb-4">{icon}</div>
    <h3 className="font-headline text-xl mb-2 text-[#1B4D3E]">{title}</h3>
    <p className="text-gray-600 text-sm mb-4">{description}</p>
    <a href="#" className="text-sm font-semibold text-[#1B4D3E] hover:text-[#B8860B]">Leer Más &rarr;</a>
  </div>
);

const TestimonialCard = ({ name, quote }: { name: string; quote: string }) => (
    <Card className="p-6 text-left">
        <MessageCircle className="h-8 w-8 text-[#D4AF37] mb-4" />
        <p className="text-gray-600 mb-4">"{quote}"</p>
        <div className="flex items-center">
            <Avatar>
                <AvatarImage src={`https://placehold.co/40x40.png`} alt={name} data-ai-hint="person avatar" />
                <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <p className="ml-4 font-semibold text-[#1B4D3E]">{name}</p>
        </div>
    </Card>
);
