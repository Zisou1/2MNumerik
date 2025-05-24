function Input({ 
  label, 
  type = "text", 
  id, 
  value, 
  onChange, 
  placeholder, 
  className = "" 
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={id}>
        {label}
      </label>
      <input
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}

export default Input