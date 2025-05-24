function Button({ 
  children, 
  type = "button", 
  onClick, 
  className = "",
  variant = "primary" 
}) {
  const baseClasses = "w-full font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
  
  const variants = {
    primary: "bg-[#00AABB] hover:bg-[#82d0d7] text-white",
    secondary: "bg-gray-500 hover:bg-gray-600 text-white",
  }

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${className}`}
      type={type}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default Button