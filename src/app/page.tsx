

'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Shield, Landmark, Briefcase, HeartHandshake, Building, Users, MessageCircle, Mail, Phone, MapPin, Facebook, Twitter, Instagram, FileText, Handshake, Gavel, ArrowLeft, ArrowRight, Menu, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useToast } from '@/hooks/use-toast';
import { getBlogArticles } from '@/services/blog-service';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const submitPublicFormCallable = httpsCallable(functions, 'submitPublicForm');

const NavLink = ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void; }) => (
  <a href={href} onClick={onClick} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
    {children}
  </a>
);

export default function LandingPage() {
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
   const { toast } = useToast();
   const [newsletterEmail, setNewsletterEmail] = useState('');
   const [isSubscribing, setIsSubscribing] = useState(false);
   const [articles, setArticles] = useState<any[]>([]);
   const [isLoadingArticles, setIsLoadingArticles] = useState(true);

   const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
   const [isSendingContact, setIsSendingContact] = useState(false);

   const teamMembers = [
    { name: 'Dr. Robinson Rada Gonzalez', role: 'Abogado Titular' },
    { name: 'Marcela Sanches Rodriguez', role: 'Abogada' },
    { name: 'Fernando Alonso Hernadez', role: 'Abogado' },
    { name: 'Luis Carlos Arzuza', role: 'Analista de Pensiones' },
  ];

  React.useEffect(() => {
    const fetchArticles = async () => {
      setIsLoadingArticles(true);
      try {
        const blogArticles = await getBlogArticles();
        setArticles(blogArticles);
      } catch (error) {
        console.error("Failed to fetch blog articles:", error);
        toast({
          variant: 'destructive',
          title: 'Error de Blog',
          description: 'No se pudieron cargar las noticias.'
        });
      } finally {
        setIsLoadingArticles(false);
      }
    };
    fetchArticles();
  }, [toast]);
   
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, ingrese un correo electrónico.' });
      return;
    }
    setIsSubscribing(true);
    try {
      await submitPublicFormCallable({ formType: 'newsletter', data: { email: newsletterEmail } });
      toast({ title: '¡Suscrito!', description: 'Gracias por suscribirse a nuestro boletín.' });
      setNewsletterEmail('');
    } catch (error: any) {
      console.error("Error subscribing to newsletter:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo completar la suscripción.' });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Por favor, rellene todos los campos del formulario.' });
      return;
    }
    setIsSendingContact(true);
    try {
      await submitPublicFormCallable({ formType: 'contact', data: contactForm });
      toast({ title: 'Mensaje Enviado', description: 'Gracias por contactarnos. Le responderemos pronto.' });
      setContactForm({ name: '', email: '', message: '' });
    } catch (error: any) {
        console.error("Error sending contact message:", error);
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo enviar su mensaje. Inténtelo de nuevo.' });
    } finally {
        setIsSendingContact(false);
    }
  };


  return (
    <div className="bg-[#FCFBF8] text-gray-800 font-body">
      <header className="sticky top-0 left-0 right-0 z-20 bg-[#FCFBF8]/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto flex justify-between items-center p-4">
          <Link href="/" className="flex items-center gap-2">
             <Image 
                src="https://firebasestorage.googleapis.com/v0/b/pensionados-d82b2.appspot.com/o/logos%2Flogo-removebg-preview.png?alt=media&token=9a935e08-66dd-4edc-83f8-31320b0b2680"
                alt="Dajusticia Logo"
                width={150}
                height={40}
                className="h-10 w-auto"
                priority
             />
          </Link>
          <nav className="hidden lg:flex items-center space-x-6">
            <NavLink href="#servicios">Servicios</NavLink>
            <NavLink href="#nosotros">Nosotros</NavLink>
            <NavLink href="#proceso">Proceso</NavLink>
            <NavLink href="#equipo">Equipo</NavLink>
            <NavLink href="#noticias">Noticias</NavLink>
            <NavLink href="#testimonios">Testimonios</NavLink>
            <NavLink href="#contacto">Contacto</NavLink>
          </nav>
          <div className="hidden lg:flex items-center space-x-2">
             <Button asChild variant="outline" className="border-gray-300 hover:bg-gray-100">
                <Link href="/login">Acceder</Link>
            </Button>
            <Button asChild className="bg-[#2E4B48] text-white hover:bg-[#2E4B48]/90">
              <Link href="/registro">Consulta tu caso</Link>
            </Button>
          </div>
          <div className="lg:hidden">
            <Button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} variant="ghost" size="icon">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#FCFBF8]/95 backdrop-blur-sm absolute top-full left-0 w-full border-b border-gray-200">
            <nav className="flex flex-col items-center space-y-4 p-4">
              <NavLink href="#servicios" onClick={() => setIsMobileMenuOpen(false)}>Servicios</NavLink>
              <NavLink href="#nosotros" onClick={() => setIsMobileMenuOpen(false)}>Nosotros</NavLink>
              <NavLink href="#proceso" onClick={() => setIsMobileMenuOpen(false)}>Proceso</NavLink>
              <NavLink href="#equipo" onClick={() => setIsMobileMenuOpen(false)}>Equipo</NavLink>
              <NavLink href="#noticias" onClick={() => setIsMobileMenuOpen(false)}>Noticias</NavLink>
              <NavLink href="#testimonios" onClick={() => setIsMobileMenuOpen(false)}>Testimonios</NavLink>
              <NavLink href="#contacto" onClick={() => setIsMobileMenuOpen(false)}>Contacto</NavLink>
              <div className="flex flex-col w-full max-w-xs space-y-2 pt-4 border-t border-gray-200">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Acceder</Link>
                </Button>
                <Button asChild className="w-full bg-[#2E4B48] text-white hover:bg-[#2E4B48]/90">
                  <Link href="/registro">Consulta tu caso</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <section className="relative bg-cover bg-center h-[70vh] md:h-screen flex items-center text-white" style={{ backgroundImage: "url('https://firebasestorage.googleapis.com/v0/b/pensionados-d82b2.appspot.com/o/logos%2FF_2-1-1280x853.jpg?alt=media&token=316694c6-f680-4271-871f-3728d2326660')" }}>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="container mx-auto text-center relative z-10 px-4">
          <p className="font-semibold text-[#D4AF37] text-sm uppercase tracking-widest">ASESORÍA LEGAL EXPERTA EN PENSIONES</p>
          <h1 className="text-4xl md:text-6xl font-headline mt-2 mb-4">Expertos en derecho laboral y seguridad social</h1>
          <p className="max-w-2xl mx-auto text-gray-300 mb-8">
            Aseguramos el futuro que mereces. Analizamos tu caso pensional y laboral para garantizar que recibas lo justo. Consulta tu caso gratis.
          </p>
          <Button asChild size="lg" className="bg-[#D4AF37] text-black hover:bg-[#B8860B]">
            <Link href="/registro">Inicia tu Reclamación</Link>
          </Button>
        </div>
      </section>

      <section id="nosotros" className="py-16 md:py-24">
        <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center px-4">
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[500px]">
            <div className="row-span-2">
                <Image src="https://firebasestorage.googleapis.com/v0/b/pensionados-d82b2.appspot.com/o/logos%2Ffoto3.webp?alt=media&token=e3d57600-a893-4113-8b6a-180a4c420889" alt="Ancianos felices" width={300} height={500} className="rounded-lg shadow-lg object-cover w-full h-full" data-ai-hint="happy elderly couple" />
            </div>
            <div className="row-span-1">
                <Image src="https://firebasestorage.googleapis.com/v0/b/pensionados-d82b2.appspot.com/o/logos%2Ffoto1.webp?alt=media&token=128d6b70-a409-4449-906f-f7ab0c0ce747" alt="Apretón de manos" width={300} height={242} className="rounded-lg shadow-lg object-cover w-full h-full" data-ai-hint="handshake business" />
            </div>
            <div className="row-span-1">
                 <Image src="https://firebasestorage.googleapis.com/v0/b/pensionados-d82b2.appspot.com/o/logos%2Ffoto2.webp?alt=media&token=8c0f7c3c-d7b0-42b6-9612-7ad186ebc5bf" alt="Reunión de abogados" width={300} height={242} className="rounded-lg shadow-lg object-cover w-full h-full" data-ai-hint="lawyers meeting" />
            </div>
          </div>
          <div>
            <p className="text-[#B8860B] font-semibold uppercase text-sm">NUESTRA FIRMA</p>
            <h2 className="text-3xl md:text-4xl font-headline mt-2 mb-6 text-[#1B4D3E]">¿Por Qué Confiar en Dajusticia?</h2>
            <ul className="space-y-4 text-gray-700">
                <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-[#BFA16A] mr-3 mt-1 shrink-0" />
                    <span>Más de 20 años de experiencia en derecho pensional.</span>
                </li>
                <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-[#BFA16A] mr-3 mt-1 shrink-0" />
                    <span>Atención personalizada y comunicación constante sobre tu caso.</span>
                </li>
                <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-[#BFA16A] mr-3 mt-1 shrink-0" />
                    <span>Especialistas en procesos contra Colpensiones y fondos privados.</span>
                </li>
                <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-[#BFA16A] mr-3 mt-1 shrink-0" />
                    <span>Compromiso total con la defensa de tus derechos pensionales.</span>
                </li>
                <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-[#BFA16A] mr-3 mt-1 shrink-0" />
                    <span>Altas tasas de éxito en casos de reajuste pensional.</span>
                </li>
                 <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-[#BFA16A] mr-3 mt-1 shrink-0" />
                    <span>Confidencialidad y ética profesional garantizadas.</span>
                </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="proceso" className="py-16 md:py-24 bg-[#FFF8E7]">
        <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center px-4">
          <div className="aspect-video">
            <iframe 
                className="w-full h-full rounded-lg shadow-lg" 
                src="https://www.youtube.com/embed/PAkd58b5je4" 
                title="Recuperación de mesada pensional" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen>
            </iframe>
          </div>
          <div>
            <p className="text-[#B8860B] font-semibold uppercase text-sm">ANÁLISIS DE CASOS PENSIONALES</p>
            <h2 className="text-3xl md:text-4xl font-headline mt-2 mb-8 text-[#1B4D3E]">Recibimos Tu Caso Y Lo Analizamos.</h2>
            <div className="relative pl-8">
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gray-300 border-l border-dashed"></div>
              <div className="relative mb-8">
                <div className="absolute -left-[25px] top-0 bg-[#D4AF37]/20 p-2 rounded-full ring-8 ring-[#FFF8E7]">
                    <Handshake className="h-5 w-5 text-[#B8860B]" />
                </div>
                <h3 className="font-headline text-xl text-[#1B4D3E] mb-1">Consulta Inicial Gratuita</h3>
                <p className="text-gray-600 text-sm">Nuestros abogados expertos analizan tu caso y tus documentos pensionales para identificar oportunidades de reajuste o reclamación.</p>
              </div>
              <div className="relative mb-8">
                <div className="absolute -left-[25px] top-0 bg-[#D4AF37]/20 p-2 rounded-full ring-8 ring-[#FFF8E7]">
                    <FileText className="h-5 w-5 text-[#B8860B]" />
                </div>
                <h3 className="font-headline text-xl text-[#1B4D3E] mb-1">Evaluación de Viabilidad</h3>
                <p className="text-gray-600 text-sm">Determinamos la viabilidad legal de tu caso y te explicamos de forma clara el potencial de tu reclamación pensional.</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[25px] top-0 bg-[#D4AF37]/20 p-2 rounded-full ring-8 ring-[#FFF8E7]">
                    <Gavel className="h-5 w-5 text-[#B8860B]" />
                </div>
                <h3 className="font-headline text-xl text-[#1B4D3E] mb-1">Estrategia y Representación Legal</h3>
                <p className="text-gray-600 text-sm">Desarrollamos un plan de acción y te representamos legalmente para lograr el mejor resultado posible para tu pensión.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#BFA16A] text-[#1B4D3E]">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 py-12 text-center">
          <div><p className="text-4xl font-bold">20+</p><p className="text-sm">AÑOS DE EXPERIENCIA</p></div>
          <div><p className="text-4xl font-bold">500+</p><p className="text-sm">CASOS DE PENSIÓN EXITOSOS</p></div>
          <div><p className="text-4xl font-bold">98%</p><p className="text-sm">SATISFACCIÓN DEL CLIENTE</p></div>
          <div><p className="text-4xl font-bold">10M+</p><p className="text-sm">RECUPERADOS PARA CLIENTES</p></div>
        </div>
      </section>

      <section id="servicios" className="py-16 md:py-24">
        <div className="container mx-auto text-center px-4">
          <p className="text-[#1B4D3E] font-semibold uppercase text-sm">Nuestras Áreas</p>
          <h2 className="text-3xl md:text-4xl font-headline mt-2 mb-4 text-[#1B4D3E]">Servicios Legales Que Ofrecemos</h2>
          <p className="max-w-3xl mx-auto text-gray-600 mb-12">
            En Dajusticia creemos que los clientes pensionales, laborales y civiles merecen una representación legal completa, en casos fundamentales para su tranquilidad y futuro. Por ello, hemos consolidado un modelo de servicio estructurado, atendido por diferentes áreas y equipos especializados, integrales, sinérgicos y convergentes.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ServiceCard icon={<Landmark />} title="Reajuste Pensional" description="Reclamamos la falta de indexación pensional y la reliquidación de la mesada para lograr un monto justo y generoso." />
            <ServiceCard icon={<Shield />} title="Pensión de Vejez" description="Te asesoramos en el cumplimiento de requisitos para tu retiro laboral y hacemos los trámites con Colpensiones, UGPP o fondos." />
            <ServiceCard icon={<Users />} title="Pensión de Invalidez" description="Te representamos para que obtengas el reconocimiento y pago de tu derecho por pérdida de capacidad laboral." />
            <ServiceCard icon={<Briefcase />} title="Pensión de Sobrevivientes" description="Asesoramos a los beneficiarios a reclamar la pensión que por ley dejó un cotizante o un pensionado al momento de su deceso." />
            <ServiceCard icon={<HeartHandshake />} title="Derecho Laboral" description="Te apoyamos en casos de acoso, despidos, agotamiento y reclamación de derechos laborales." />
            <ServiceCard icon={<Building />} title="Consultoría Empresarial" description="Brindamos soporte legal para que tu empresa se mantenga al día con todas las normativas." />
          </div>
        </div>
      </section>

      <section id="equipo" className="py-16 md:py-24 bg-[#1B4D3E] text-white">
        <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center px-4">
          <div>
            <p className="text-[#D4AF37] font-semibold uppercase text-sm">Nuestro Equipo</p>
            <h2 className="text-3xl md:text-4xl font-headline mt-2 mb-6">Abogados Dedicados. Resultados Comprobados</h2>
            <p className="text-gray-300 mb-8">Conoce a los profesionales que lucharán por tus derechos.</p>
            <Button asChild variant="outline" className="bg-transparent border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#1B4D3E]">
              <Link href="#contacto">Contáctanos &rarr;</Link>
            </Button>
          </div>
          <div className="w-full">
            <Carousel opts={{ align: "start", loop: true }} className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto">
              <CarouselContent>
                {teamMembers.map((member, index) => (
                  <CarouselItem key={index} className="md:basis-1/2">
                    <div className="p-1">
                      <Card className="bg-transparent border-0 shadow-none">
                        <CardContent className="flex flex-col items-center justify-center p-0 text-center">
                          <Image
                            src={`https://placehold.co/280x320.png`}
                            alt={`Foto de ${member.name}`}
                            width={280}
                            height={320}
                            className="rounded-lg object-cover"
                            data-ai-hint="lawyer portrait"
                          />
                          <div className="mt-[-60px] relative z-10 bg-[#1B4D3E]/80 backdrop-blur-sm p-4 rounded-lg w-10/12">
                            <p className="font-semibold text-sm">{member.name}</p>
                            <p className="text-xs text-gray-300">{member.role}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="text-white bg-white/20 hover:bg-white/30 border-none -left-4" />
              <CarouselNext className="text-white bg-white/20 hover:bg-white/30 border-none -right-4" />
            </Carousel>
          </div>
        </div>
      </section>

      <section id="noticias" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-headline text-center mb-4 text-[#1B4D3E]">Últimas Noticias y Artículos</h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">Manténgase informado con nuestros análisis y noticias sobre el mundo pensional y laboral.</p>
          {isLoadingArticles ? (
            <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <Card key={article.id} className="flex flex-col overflow-hidden group">
                  <Image src={article.coverImageUrl} alt={article.title} width={400} height={250} className="w-full h-48 object-cover transition-transform group-hover:scale-105" />
                  <CardHeader>
                    <h3 className="font-headline text-xl text-[#1B4D3E]">{article.title}</h3>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-gray-600 line-clamp-3">{article.excerpt}</p>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Button variant="link" className="p-0 text-[#B8860B]">Leer más &rarr;</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="testimonios" className="py-16 md:py-24">
        <div className="container mx-auto text-center px-4">
          <p className="text-[#1B4D3E] font-semibold uppercase text-sm">Confianza</p>
          <h2 className="text-3xl md:text-4xl font-headline mt-2 mb-12 text-[#1B4D3E]">Qué Dicen Nuestros Clientes</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <TestimonialCard name="Carlos Vargas" quote="El equipo de Dajusticia me brindó un acompañamiento excepcional durante todo mi proceso de reajuste pensional. Lograron lo que parecía imposible. ¡Totalmente recomendados!" />
            <TestimonialCard name="Rosalba Franco" quote="Estaba perdida con mi trámite de pensión de sobreviviente. Gracias a Dajusticia, hoy tengo la tranquilidad que mi esposo quería para mí. Fueron muy humanos y profesionales." />
          </div>
        </div>
      </section>

      <section id="contacto" className="py-16 md:py-24 bg-[#1B4D3E]">
        <div className="container mx-auto">
          <div className="bg-[#FCFBF8] rounded-lg shadow-xl overflow-hidden grid md:grid-cols-2">
            <div className="p-8 md:p-12">
              <p className="text-[#B8860B] font-semibold uppercase text-sm">INICIE SU CASO</p>
              <h2 className="text-3xl md:text-4xl font-headline mt-2 mb-6 text-[#1B4D3E]">Ingrese Sus Datos Y Te Contactaremos</h2>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <Input 
                  name="name" 
                  placeholder="Nombre Completo" 
                  className="bg-white border-gray-300"
                  value={contactForm.name}
                  onChange={handleContactFormChange}
                  disabled={isSendingContact}
                  required
                />
                <Input 
                  name="email" 
                  placeholder="Correo Electrónico" 
                  type="email" 
                  className="bg-white border-gray-300"
                  value={contactForm.email}
                  onChange={handleContactFormChange}
                  disabled={isSendingContact}
                  required
                />
                <Textarea 
                  name="message" 
                  placeholder="Describa brevemente su caso" 
                  className="bg-white border-gray-300" 
                  rows={4}
                  value={contactForm.message}
                  onChange={handleContactFormChange}
                  disabled={isSendingContact}
                  required
                />
                <Button type="submit" size="lg" className="w-full bg-[#1B4D3E] text-white hover:bg-[#0F766E]" disabled={isSendingContact}>
                  {isSendingContact ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar Mensaje"}
                </Button>
              </form>
            </div>
            <div className="relative hidden md:block">
              <Image 
                src="https://firebasestorage.googleapis.com/v0/b/pensionados-d82b2.appspot.com/o/logos%2Ffoto4.webp?alt=media&token=babdd134-b9ad-4ce3-ba29-8c03236cc4b3"
                alt="Persona trabajando en un portátil"
                layout="fill"
                objectFit="cover"
                data-ai-hint="person working"
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#0A192F] text-gray-400 py-12">
        <div className="container mx-auto grid md:grid-cols-4 gap-8 px-4">
          <div>
             <Image 
                src="https://firebasestorage.googleapis.com/v0/b/pensionados-d82b2.appspot.com/o/logos%2Flogo-removebg-preview.png?alt=media&token=9a935e08-66dd-4edc-83f8-31320b0b2680"
                alt="Dajusticia Logo"
                width={150}
                height={40}
                className="h-10 w-auto mb-4"
             />
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
            <form onSubmit={handleNewsletterSubmit} className="flex">
              <Input 
                placeholder="Su correo" 
                className="bg-gray-800 border-gray-600 rounded-r-none"
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                disabled={isSubscribing}
                required
              />
              <Button type="submit" className="bg-[#D4AF37] text-black rounded-l-none hover:bg-[#B8860B]" disabled={isSubscribing}>
                {isSubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'OK'}
              </Button>
            </form>
          </div>
        </div>
        <div className="container mx-auto text-center border-t border-gray-800 mt-8 pt-6 text-xs">
          <p>© {new Date().getFullYear()} Dajusticia. Todos los derechos reservados. | <Link href="/politica-privacidad" className="hover:text-white underline">Política de Tratamiento de Datos</Link></p>
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
      <CardHeader className="p-0">
        <MessageCircle className="h-8 w-8 text-[#D4AF37] mb-4" />
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-gray-600 mb-4">"{quote}"</p>
        <div className="flex items-center">
            <Avatar>
                <AvatarImage src={`https://placehold.co/40x40.png`} alt={name} data-ai-hint="person avatar" />
                <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <p className="ml-4 font-semibold text-[#1B4D3E]">{name}</p>
        </div>
      </CardContent>
    </Card>
);
