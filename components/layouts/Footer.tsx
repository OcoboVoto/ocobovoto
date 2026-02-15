// components/layouts/Footer.tsx
interface FooterProps {
    role: 'SUPER_ADMIN' | 'ADMIN';
    conjuntoName?: string;
    conjuntoNit?: string;
  }
  
  export const Footer = ({ role, conjuntoName, conjuntoNit }: FooterProps) => {
    const currentYear = new Date().getFullYear();
  
    //if (role === 'SUPER_ADMIN') {
        return (  
            <footer className="w-full pt-6 mt-8 border-t border-gray-200">  
              <div className="flex justify-center items-center text-xs text-gray-500">  
                <div className="text-center">  
                  <span>© {currentYear} OcoVoto.</span>  
                  <br />  
                  <span>Todos los derechos reservados.</span>  
                </div>  
              </div>  
            </footer>  
          );
    //}
  
    // Footer para ADMIN
    {/*
    return (
      <footer className="w-full pt-6 mt-8 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <div className="flex flex-col items-center sm:items-start">
            <span className="font-medium text-gray-600">
              {conjuntoName || 'Conjunto Residencial'}
            </span>
            {conjuntoNit && (
              <span className="text-gray-400">NIT: {conjuntoNit}</span>
            )}
          </div>
          
          <div className="flex gap-4">
            <a 
              href="/docs/privacidad" 
              className="hover:text-gray-700 transition-colors"
            >
              Privacidad
            </a>
            <a 
              href="/docs/terminos" 
              className="hover:text-gray-700 transition-colors"
            >
              Términos
            </a>
            <a 
              href="/support" 
              className="hover:text-gray-700 transition-colors"
            >
              Soporte
            </a>
          </div>
  
          <div className="text-center sm:text-right text-gray-400">
            <span>Powered by OcoVoto</span>
          </div>
        </div>
      </footer>
    );*/}
  };