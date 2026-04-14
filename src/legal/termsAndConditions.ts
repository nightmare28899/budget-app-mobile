import { AppLanguage } from '../i18n/index';

export const TERMS_VERSION = '2026-04-06';

export type TermsSection = {
    title: string;
    paragraphs: string[];
};

export type TermsDocument = {
    effectiveDate: string;
    intro: string;
    sections: TermsSection[];
    closing: string;
};

export const termsDocuments: Record<AppLanguage, TermsDocument> = {
    en: {
        effectiveDate: 'April 6, 2026',
        intro:
            'These Terms and Conditions govern your use of BudgetApp, including guest mode, account-based sync, reports, notifications, and any Premium features made available through the service.',
        sections: [
            {
                title: 'Acceptance of Terms',
                paragraphs: [
                    'By creating an account, continuing with Google, or using BudgetApp in guest mode, you confirm that you have read and accepted these Terms and Conditions.',
                    'If you do not agree with these terms, do not use the app or its connected services.',
                ],
            },
            {
                title: 'Service Description',
                paragraphs: [
                    'BudgetApp is a personal finance tool for recording expenses, subscriptions, savings goals, and related budgeting information.',
                    'The app is provided for organizational and informational purposes only. It does not provide banking, brokerage, tax, accounting, or legal services.',
                ],
            },
            {
                title: 'Accounts and Eligibility',
                paragraphs: [
                    'You are responsible for providing accurate account information and for keeping your sign-in credentials secure.',
                    'You are responsible for activity that happens through your account or device when that activity results from your failure to protect credentials or local access.',
                ],
            },
            {
                title: 'Guest Mode, Sync, and Storage',
                paragraphs: [
                    'If you use guest mode, some information may be stored only on your device and may be lost if the app is deleted, the device is reset, or storage is cleared.',
                    'Cloud backup, synchronization, account recovery, notifications, and Premium restoration depend on a valid account, network availability, and third-party platform services.',
                ],
            },
            {
                title: 'Acceptable Use',
                paragraphs: [
                    'You agree not to misuse the app, interfere with its security, attempt unauthorized access, upload malicious content, or use the service for unlawful activity.',
                    'You also agree not to reverse engineer, copy, resell, or overload the service except where applicable law cannot restrict that activity.',
                ],
            },
            {
                title: 'Third-Party Services and Premium',
                paragraphs: [
                    'BudgetApp may rely on third-party providers such as Firebase, Google Sign-In, email services, and cloud infrastructure. Their availability can affect some features.',
                    'Premium availability, limits, or included tools may change over time and may be managed outside the mobile app.',
                ],
            },
            {
                title: 'No Financial Advice',
                paragraphs: [
                    'BudgetApp does not guarantee financial outcomes and does not replace professional financial, tax, or legal advice.',
                    'You are responsible for reviewing your records and making independent decisions based on your own situation.',
                ],
            },
            {
                title: 'Availability, Updates, and Termination',
                paragraphs: [
                    'We may update, pause, limit, or remove features when needed for security, maintenance, compliance, or product changes.',
                    'We may suspend or end access to the service if we detect abuse, fraud, security threats, or violations of these terms.',
                ],
            },
            {
                title: 'Intellectual Property and Changes to Terms',
                paragraphs: [
                    'The app, its design, branding, and related software remain protected by applicable intellectual property rights.',
                    'We may update these terms in future releases. Continued use of BudgetApp after the effective date of an updated version means you accept the revised terms.',
                ],
            },
        ],
        closing:
            'Use BudgetApp only if these conditions work for your needs and responsibilities.',
    },
    es: {
        effectiveDate: '6 de abril de 2026',
        intro:
            'Estos Términos y Condiciones regulan el uso de BudgetApp, incluyendo el modo invitado, la sincronización con cuenta, los reportes, las notificaciones y cualquier función Premium disponible en el servicio.',
        sections: [
            {
                title: 'Aceptación de los términos',
                paragraphs: [
                    'Al crear una cuenta, continuar con Google o usar BudgetApp en modo invitado, confirmas que leíste y aceptaste estos Términos y Condiciones.',
                    'Si no estás de acuerdo con estos términos, no uses la app ni sus servicios conectados.',
                ],
            },
            {
                title: 'Descripción del servicio',
                paragraphs: [
                    'BudgetApp es una herramienta de finanzas personales para registrar gastos, suscripciones, metas de ahorro e información relacionada con tu presupuesto.',
                    'La app se ofrece con fines de organización e información. No presta servicios bancarios, bursátiles, fiscales, contables ni legales.',
                ],
            },
            {
                title: 'Cuentas y elegibilidad',
                paragraphs: [
                    'Eres responsable de proporcionar información de cuenta correcta y de mantener seguras tus credenciales de acceso.',
                    'Eres responsable de la actividad que ocurra a través de tu cuenta o dispositivo cuando esa actividad resulte de no proteger tus credenciales o el acceso local.',
                ],
            },
            {
                title: 'Modo invitado, sincronización y almacenamiento',
                paragraphs: [
                    'Si usas el modo invitado, parte de la información puede quedar guardada solo en tu dispositivo y puede perderse si borras la app, reinicias el dispositivo o limpias el almacenamiento.',
                    'El respaldo en la nube, la sincronización, la recuperación de cuenta, las notificaciones y la restauración Premium dependen de una cuenta válida, de la disponibilidad de red y de servicios de terceros.',
                ],
            },
            {
                title: 'Uso permitido',
                paragraphs: [
                    'Aceptas no usar indebidamente la app, no interferir con su seguridad, no intentar accesos no autorizados, no subir contenido malicioso y no usar el servicio para actividades ilícitas.',
                    'También aceptas no descompilar, copiar, revender ni sobrecargar el servicio, salvo cuando la ley aplicable no permita restringir esa actividad.',
                ],
            },
            {
                title: 'Servicios de terceros y Premium',
                paragraphs: [
                    'BudgetApp puede depender de proveedores externos como Firebase, Google Sign-In, servicios de correo e infraestructura en la nube. Su disponibilidad puede afectar algunas funciones.',
                    'La disponibilidad de Premium, sus límites o las herramientas incluidas pueden cambiar con el tiempo y pueden administrarse fuera de la app móvil.',
                ],
            },
            {
                title: 'Sin asesoría financiera',
                paragraphs: [
                    'BudgetApp no garantiza resultados financieros y no sustituye asesoría profesional financiera, fiscal o legal.',
                    'Eres responsable de revisar tus registros y de tomar decisiones independientes según tu situación.',
                ],
            },
            {
                title: 'Disponibilidad, actualizaciones y terminación',
                paragraphs: [
                    'Podemos actualizar, pausar, limitar o retirar funciones cuando sea necesario por seguridad, mantenimiento, cumplimiento o cambios del producto.',
                    'Podemos suspender o terminar el acceso al servicio si detectamos abuso, fraude, riesgos de seguridad o incumplimientos de estos términos.',
                ],
            },
            {
                title: 'Propiedad intelectual y cambios a los términos',
                paragraphs: [
                    'La app, su diseño, su marca y el software relacionado siguen protegidos por los derechos de propiedad intelectual aplicables.',
                    'Podemos actualizar estos términos en versiones futuras. Seguir usando BudgetApp después de la fecha de vigencia de una versión actualizada significa que aceptas los términos revisados.',
                ],
            },
        ],
        closing:
            'Usa BudgetApp solo si estas condiciones funcionan para tus necesidades y responsabilidades.',
    },
};
