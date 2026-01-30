import React, { createContext, useContext, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const AccordionContext = createContext({});

const Accordion = ({ children, type = "single", defaultValue, className, ...props }) => {
  // Simple state management for 'multiple' or 'single'
  // Note: defaultValue for multiple should be an array, for single a string
  const [value, setValue] = useState(defaultValue || (type === "multiple" ? [] : ""));

  const handleValueChange = (itemValue) => {
    if (type === "multiple") {
      setValue((prev) =>
        prev.includes(itemValue)
          ? prev.filter((v) => v !== itemValue)
          : [...prev, itemValue]
      );
    } else {
      setValue((prev) => (prev === itemValue ? "" : itemValue));
    }
  };

  return (
    <AccordionContext.Provider value={{ value, onValueChange: handleValueChange, type }}>
      <div className={cn("", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

const AccordionItem = ({ children, value, className, ...props }) => {
  return (
    <div className={cn("border-b", className)} {...props} data-value={value}>
        {/* We pass 'value' to children via cloning or context if needed, 
            but better to let Trigger/Content use Context + mapped value if explicit.
            Actually, Radix requires 'value' on Item. We need context to pass this down?
            Or simpler: just use a local context for the Item value.
        */}
        <AccordionItemContext.Provider value={value}>
            {children}
        </AccordionItemContext.Provider>
    </div>
  );
};

const AccordionItemContext = createContext(null);

const AccordionTrigger = ({ children, className, ...props }) => {
  const { value: selectedValue, onValueChange, type } = useContext(AccordionContext);
  const itemValue = useContext(AccordionItemContext);

  const isOpen = type === "multiple" 
    ? Array.isArray(selectedValue) && selectedValue.includes(itemValue)
    : selectedValue === itemValue;

  return (
    <h3 className="flex">
      <button
        type="button"
        onClick={() => onValueChange(itemValue)}
        className={cn(
          "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
          className
        )}
        data-state={isOpen ? "open" : "closed"}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
      </button>
    </h3>
  );
};

const AccordionContent = ({ children, className, ...props }) => {
  const { value: selectedValue, type } = useContext(AccordionContext);
  const itemValue = useContext(AccordionItemContext);

    const isOpen = type === "multiple" 
    ? Array.isArray(selectedValue) && selectedValue.includes(itemValue)
    : selectedValue === itemValue;

  if (!isOpen) return null;

  return (
    <div
      className={cn("overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down", className)}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </div>
  );
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
