import { AppLanguage } from '../i18n/index';

export const PRIVACY_POLICY_VERSION = '2026-08-26';

export type PrivacySection = {
    title: string;
    paragraphs: string[];
};

export type PrivacyDocument = {
    effectiveDate: string;
    intro: string;
    sections: PrivacySection[];
    closing: string;
};

export const privacyDocuments: Record<AppLanguage, PrivacyDocument> = {
    en: {
        effectiveDate: 'August 26, 2026',
        intro:
            'This Privacy Policy explains how BudgetApp handles information when you use the mobile application, guest mode, account services, notifications, and connected features.',
        sections: [
            {
                title: 'Information we collect',
                paragraphs: [
                    'Depending on the features you use, BudgetApp may process your name, email address, profile photo, account identifiers, device and notification identifiers, and the financial records you choose to enter, such as expenses, income, cards, subscriptions, installments, budgets, and savings goals.',
                    'Photos or files are processed only when you choose to attach them, for example to a profile or expense record.',
                ],
            },
            {
                title: 'How we use information',
                paragraphs: [
                    'We use this information to authenticate your account, provide budgeting features, synchronize your records, protect the service, send requested notifications, respond to support requests, and improve reliability.',
                    'BudgetApp does not sell your financial records and does not use them to provide banking, lending, investment, tax, or legal services.',
                ],
            },
            {
                title: 'Guest mode and local storage',
                paragraphs: [
                    'Guest mode may keep information on your device without associating it with a cloud account. That information can be lost if you remove the app, reset the device, or clear its storage.',
                    'When you create an account, information may be synchronized with the BudgetApp service according to the features enabled for your account.',
                ],
            },
            {
                title: 'Service providers',
                paragraphs: [
                    'BudgetApp may use providers for authentication, push notifications, file storage, hosting, analytics, and other infrastructure needed to operate the service. Providers process information only according to their applicable terms and our instructions where required.',
                    'Some providers may process information outside your country. The applicable provider details and updates will be reflected in the current version of this policy.',
                ],
            },
            {
                title: 'Security and retention',
                paragraphs: [
                    'We use reasonable technical and organizational measures to protect account and financial information. No online service can guarantee absolute security, so keep your credentials and device access protected.',
                    'We retain information while it is needed to provide the service, comply with legal obligations, resolve disputes, or enforce agreements. When you delete your account, account records and associated files are scheduled for permanent deletion according to the account-deletion process.',
                ],
            },
            {
                title: 'Your choices and requests',
                paragraphs: [
                    'You may review or update available account information in the app. You may revoke optional notification permissions through your device settings.',
                    'For access, correction, cancellation, opposition, revocation, or other privacy requests, use the support contact published for BudgetApp. We may need to verify your identity before completing a request.',
                ],
            },
            {
                title: 'Account deletion',
                paragraphs: [
                    'You can request permanent deletion from Settings when the feature is available for your account. Deletion removes the account and associated financial records from the BudgetApp service and clears account data stored locally on the device, subject to legally required exceptions.',
                    'Deletion is permanent. Export or keep any information you need before confirming the request.',
                ],
            },
            {
                title: 'Changes and contact',
                paragraphs: [
                    'We may update this policy when the service, providers, or legal requirements change. The effective date shown in the app identifies the current version.',
                    'For privacy questions, contact the BudgetApp support channel published in the app listing and service materials.',
                ],
            },
        ],
        closing:
            'This document is a product privacy disclosure and should be reviewed by qualified counsel before public release.',
    },
    es: {
        effectiveDate: '26 de agosto de 2026',
        intro:
            'Este Aviso de Privacidad explica cómo BudgetApp trata la información cuando utilizas la aplicación móvil, el modo invitado, los servicios de cuenta, las notificaciones y las funciones conectadas.',
        sections: [
            {
                title: 'Información que recopilamos',
                paragraphs: [
                    'Según las funciones que utilices, BudgetApp puede tratar tu nombre, correo electrónico, foto de perfil, identificadores de cuenta, identificadores del dispositivo y de notificaciones, así como los registros financieros que decidas capturar, como gastos, ingresos, tarjetas, suscripciones, mensualidades, presupuestos y metas de ahorro.',
                    'Las fotos o archivos se procesan solo cuando decides adjuntarlos, por ejemplo, a un perfil o a un registro de gasto.',
                ],
            },
            {
                title: 'Cómo usamos la información',
                paragraphs: [
                    'Usamos esta información para autenticar tu cuenta, ofrecer funciones de presupuesto, sincronizar tus registros, proteger el servicio, enviar notificaciones solicitadas, atender soporte y mejorar la confiabilidad.',
                    'BudgetApp no vende tus registros financieros ni los utiliza para prestar servicios bancarios, de crédito, inversión, impuestos o asesoría legal.',
                ],
            },
            {
                title: 'Modo invitado y almacenamiento local',
                paragraphs: [
                    'El modo invitado puede guardar información en tu dispositivo sin asociarla a una cuenta en la nube. Esa información puede perderse si eliminas la app, reinicias el dispositivo o limpias su almacenamiento.',
                    'Cuando creas una cuenta, la información puede sincronizarse con el servicio de BudgetApp según las funciones habilitadas para tu cuenta.',
                ],
            },
            {
                title: 'Proveedores de servicio',
                paragraphs: [
                    'BudgetApp puede utilizar proveedores de autenticación, notificaciones push, almacenamiento de archivos, hosting, analítica e infraestructura necesaria para operar el servicio. Los proveedores tratan la información conforme a sus términos aplicables y nuestras instrucciones cuando corresponde.',
                    'Algunos proveedores pueden tratar información fuera de tu país. Los detalles y cambios aplicables se reflejarán en la versión vigente de este aviso.',
                ],
            },
            {
                title: 'Seguridad y conservación',
                paragraphs: [
                    'Usamos medidas técnicas y organizativas razonables para proteger la información de cuenta y financiera. Ningún servicio en línea puede garantizar seguridad absoluta; protege tus credenciales y el acceso a tu dispositivo.',
                    'Conservamos la información mientras sea necesaria para prestar el servicio, cumplir obligaciones legales, resolver controversias o hacer valer acuerdos. Al eliminar tu cuenta, los registros y archivos asociados se programan para eliminación permanente conforme al proceso de eliminación.',
                ],
            },
            {
                title: 'Tus opciones y solicitudes',
                paragraphs: [
                    'Puedes revisar o actualizar la información de cuenta disponible desde la app. Puedes revocar permisos opcionales de notificaciones desde los ajustes del dispositivo.',
                    'Para solicitudes de acceso, rectificación, cancelación, oposición, revocación u otras relacionadas con privacidad, utiliza el contacto de soporte publicado para BudgetApp. Podemos verificar tu identidad antes de completar una solicitud.',
                ],
            },
            {
                title: 'Eliminación de cuenta',
                paragraphs: [
                    'Puedes solicitar la eliminación permanente desde Settings cuando la función esté disponible para tu cuenta. La eliminación borra la cuenta y los registros financieros asociados del servicio de BudgetApp y limpia los datos de cuenta guardados localmente, salvo excepciones exigidas por ley.',
                    'La eliminación es permanente. Exporta o conserva la información que necesites antes de confirmar la solicitud.',
                ],
            },
            {
                title: 'Cambios y contacto',
                paragraphs: [
                    'Podemos actualizar este aviso cuando cambien el servicio, los proveedores o los requisitos legales. La fecha de vigencia mostrada en la app identifica la versión actual.',
                    'Para preguntas de privacidad, utiliza el canal de soporte de BudgetApp publicado en la ficha de la app y en los materiales del servicio.',
                ],
            },
        ],
        closing:
            'Este documento es una divulgación de privacidad del producto y debe ser revisado por asesoría jurídica calificada antes de publicarse.',
    },
};
