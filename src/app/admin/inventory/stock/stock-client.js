"use client";

import { useState, useEffect } from "react";
import { Search, Bell, ChevronDown, Menu as MenuIcon } from "lucide-react";

export function StockClient({ stockItems }) {
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (id) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const filteredItems = stockItems.filter(item => 
    (item.name || item.dish?.nameEn || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col bg-[#fdfdfd]">
      <div className="mb-4 mt-8">
        <h2 className="text-[26px] font-bold text-[#ff242d]">Stock</h2>
      </div>

      <div className="flex items-center justify-between mb-6">
         <div className="bg-white border text-sm text-[#ff242d] border-[#ffeced] rounded-xl px-4 h-12 flex items-center shadow-sm w-80">
           <input 
             type="text" 
             placeholder="Search for input" 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-transparent outline-none placeholder-[#ff8a90]" 
           />
         </div>
         <button 
           onClick={() => setIsAddModalOpen(true)}
           className="text-[#ff242d] font-bold text-[15px] hover:text-[#ea1d26] transition-colors"
         >
           Add Item +
         </button>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.03)] overflow-visible relative z-10 pb-20">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-slate-100/80">
              <th className="px-8 py-5 text-left font-bold text-[#ff242d]">Name</th>
              <th className="px-8 py-5 text-left font-bold text-[#ff242d]">Quantity</th>
              <th className="px-8 py-5 text-left font-bold text-[#ff242d]">Created By</th>
              <th className="px-8 py-5 text-left font-bold text-[#ff242d]">Supplier</th>
              <th className="px-8 py-5 text-left font-bold text-[#ff242d]">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="border-b border-slate-50/50 hover:bg-slate-50/50 transition-colors select-none">
                <td className="px-8 py-5 font-semibold text-slate-800">{item.name || item.dish?.nameEn}</td>
                <td className="px-8 py-5 text-slate-800 font-medium">{item.quantity}</td>
                <td className="px-8 py-5 text-slate-800 font-medium">{item.createdBy}</td>
                <td className="px-8 py-5 text-slate-800 font-medium">{item.supplier}</td>
                <td className="px-8 py-5">
                  <div className="relative w-max action-menu-container">
                    <button onClick={() => toggleMenu(item.id)} className="text-[#ff242d] hover:opacity-75 focus:outline-none flex flex-col gap-1 items-start w-5">
                      <div className="h-[2px] w-full bg-[#ff242d] rounded-full"></div>
                      <div className="h-[2px] w-full bg-[#ff242d] rounded-full"></div>
                      <div className="h-[2px] w-[60%] bg-[#ff242d] rounded-full"></div>
                    </button>
                    
                    {activeMenuId === item.id && (
                      <div className="absolute right-0 top-full mt-2 w-48 rounded-[24px] bg-white p-2.5 shadow-[0_20px_60px_rgba(15,23,42,0.15)] border border-slate-100 z-50">
                        <button className="block w-full text-left rounded-[16px] px-5 py-3 text-[14px] font-semibold text-[#ff242d] bg-[#fff5f5] hover:bg-[#ffebeb] transition-colors mb-1">Edit</button>
                        <button className="block w-full text-left rounded-[16px] px-5 py-3 text-[14px] font-semibold text-[#ff242d] hover:bg-slate-50 transition-colors">Add more items</button>
                        <button className="block w-full text-left rounded-[16px] px-5 py-3 text-[14px] font-semibold text-[#ff242d] hover:bg-slate-50 transition-colors">Delete</button>
                        <button className="block w-full text-left rounded-[16px] px-5 py-3 text-[14px] font-semibold text-[#ff242d] hover:bg-slate-50 transition-colors">Print</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-bold text-[#ff242d]">Add New Item</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
                <input type="text" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]" placeholder="e.g. Flour" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Quantity</label>
                <input type="number" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]" placeholder="0" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Supplier</label>
                <input type="text" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]" placeholder="Supplier name" />
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 rounded-2xl bg-slate-100 py-3 font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 rounded-2xl bg-[#ff242d] py-3 font-semibold text-white hover:bg-[#ea1d26]">Save Item</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
