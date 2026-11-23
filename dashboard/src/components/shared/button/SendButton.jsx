
import Send from "@/components/icons/Send";

const SendButton = ({ isLoading, type = "submit", label = "ارسال", icon: Icon = Send, onClick, disabled }) => {
    return (
        <button
        type={type}
        onClick={onClick}
        className="group inline-flex items-center border border-green-300 dark:border-blue-600 px-4 py-2 rounded-md text-green-500 dark:text-blue-500 hover:bg-green-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-blue-500 transition-transform duration-300 transform group-hover:translate-x-1 group-focus:translate-x-1"
        disabled={isLoading || disabled}
      >
        {isLoading ? (
          <span>در حال ارسال...</span>
        ) : (
          <>
              
           <Icon aria-hidden="true" className="h-6 w-6 transition-transform duration-300 transform group-hover:translate-x-1 group-focus:translate-x-1" />
            <span className="mr-2">{label}</span>
          </>
        )}
      </button>
    );
  };
  
  export default SendButton;
  
