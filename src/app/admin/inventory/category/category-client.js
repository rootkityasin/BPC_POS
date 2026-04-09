"use client";

import { useState } from "react";
import { ListFilter, Download, Pencil, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";

export function CategoryClient({ categories, subCategories }) {
  const [activeTab, setActiveTab] = useState("categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ nameEn: "", nameBn: "", color: "#ff242d" });
  const itemsPerPage = 4;

  const activeData = activeTab === "categories" ? categories : subCategories;
  
  const filteredData = activeData.filter(item => 
    item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.nameBn.includes(searchQuery)
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  return (
    <div className="flex flex-col bg-[#fdfdfd] min-h-screen">
      <div className="mb-6 mt-2 flex items-center justify-between">
        <h2 className="text-[28px] font-bold text-[#ff242d]">{activeTab === "categories" ? "Category" : "Sub-Category"}</h2>
      </div>

      <div className="flex items-center justify-between mb-8">
         <div className="bg-white border text-[15px] border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-xl px-5 h-[52px] flex items-center w-[400px]">
           <input 
             type="text" 
             placeholder="Search for input" 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-transparent outline-none text-[#ff242d] placeholder-[#ff8a90]" 
           />
         </div>
          <button 
            onClick={() => { setIsAddModalOpen(true); setFormData({ nameEn: "", nameBn: "", color: "#ff242d" }); }}
            className="text-[#ff242d] font-bold text-[17px] hover:text-[#ea1d26] transition-colors"
          >
            Add Item +
          </button>
      </div>

      <div className="rounded-[24px] bg-white shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-slate-50 p-8">
        {/* Top Controls inside Card */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setActiveTab("categories"); setCurrentPage(1); }}
              className={`px-6 py-2.5 rounded-full text-[14px] font-bold transition-colors ${
                activeTab === "categories" 
                  ? "bg-[#cc0000] text-white" 
                  : "bg-[#ffeaea] text-[#cc0000] hover:bg-[#ffd5d5]"
              }`}
            >
              Categories
            </button>
            <button 
              onClick={() => { setActiveTab("subCategories"); setCurrentPage(1); }}
              className={`px-6 py-2.5 rounded-full text-[14px] font-bold transition-colors ${
                activeTab === "subCategories" 
                  ? "bg-[#cc0000] text-white" 
                  : "bg-[#ffeaea] text-[#cc0000] hover:bg-[#ffd5d5]"
              }`}
            >
              Sub Category
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#fff5f5] text-[#cc0000] hover:bg-[#ffeaea] transition-colors">
              <ListFilter className="h-[18px] w-[18px]" />
            </button>
            <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#fff5f5] text-[#cc0000] hover:bg-[#ffeaea] transition-colors">
              <Download className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 pb-4 text-[13px] font-bold tracking-wider text-[#cc0000] uppercase mb-2">
           {activeTab === "categories" ? (
             <>
               <div className="col-span-3">Category Name</div>
               <div className="col-span-3">Description</div>
               <div className="col-span-3 text-center">Total Items</div>
               <div className="col-span-2 text-center">Last Updated</div>
               <div className="col-span-1 text-center">Actions</div>
             </>
           ) : (
             <>
               <div className="col-span-3">Sub-Category Name</div>
               <div className="col-span-2">Category Name</div>
               <div className="col-span-2">Description</div>
               <div className="col-span-2 text-center">Total Items</div>
               <div className="col-span-2 text-center">Last Updated</div>
               <div className="col-span-1 text-center">Actions</div>
             </>
           )}
        </div>

        {/* Table Rows */}
        <div className="space-y-4">
          {paginatedData.map((item) => (
            <div 
              key={item.id} 
              className="grid grid-cols-12 gap-4 items-center px-6 py-5 rounded-[20px] bg-[#fffaf9]"
            >
              {activeTab === "categories" ? (
                <>
                  <div className="col-span-3 flex items-center gap-4">
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: item.color || "#cc0000" }} 
                    />
                    <span className="font-bold text-[14px] text-[#ff242d]">{item.nameEn}</span>
                  </div>
                  <div className="col-span-3 text-[14px] text-[#ff242d]/70 font-medium">
                    {item.nameBn}
                  </div>
                  <div className="col-span-3 text-center text-[14px] font-bold text-[#ff242d]">
                    {item._count?.dishes || 0} {item._count?.dishes === 1 ? 'Unit' : 'Units'}
                  </div>
                  <div className="col-span-2 text-center text-[14px] text-[#ff242d]/70 font-medium">
                    {formatDate(item.updatedAt)}
                  </div>
                  <div className="col-span-1 flex items-center justify-center gap-3">
                    <button className="text-[#ff242d] hover:text-[#ea1d26] transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="text-[#ff242d]/50 hover:text-[#ff242d] transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-3 flex items-center gap-4">
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: item.category?.color || "#ff242d" }} 
                    />
                    <span className="font-bold text-[14px] text-[#ff242d]">{item.nameEn}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-4">
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: item.category?.color || "#ff242d" }} 
                    />
                    <span className="font-bold text-[14px] text-[#ff242d]">{item.category?.nameEn}</span>
                  </div>
                  <div className="col-span-2 text-[14px] text-[#ff242d]/70 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.nameBn}
                  </div>
                  <div className="col-span-2 text-center text-[14px] font-bold text-[#ff242d]">
                    {item._count?.dishes || 0} {item._count?.dishes === 1 ? 'Unit' : 'Units'}
                  </div>
                  <div className="col-span-2 text-center text-[14px] text-[#ff242d]/70 font-medium">
                    {formatDate(item.updatedAt)}
                  </div>
                  <div className="col-span-1 flex items-center justify-center gap-3">
                    <button className="text-[#ff242d] hover:text-[#ea1d26] transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="text-[#ff242d]/50 hover:text-[#ff242d] transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {paginatedData.length === 0 && (
            <div className="py-12 text-center text-slate-500 font-medium">
              No categories found.
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="mt-12 flex items-center justify-between border-t border-slate-100 pt-6">
          <div className="text-[13px] font-medium text-slate-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} categories
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {Array.from({ length: totalPages }).map((_, idx) => {
              const page = idx + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-colors ${
                    currentPage === page 
                      ? "bg-[#cc0000] text-white" 
                      : "border border-slate-100 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#ff242d]">Add New Category</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#ff242d] hover:opacity-70">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Category Name (English)</label>
                <input 
                  type="text" 
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]" 
                  placeholder="e.g. Main Course" 
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Category Name (Bengali)</label>
                <input 
                  type="text" 
                  value={formData.nameBn}
                  onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]" 
                  placeholder="e.g. মূল খাবার" 
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-12 w-12 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <span className="text-[#ff242d] font-medium">{formData.color}</span>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="flex-1 rounded-2xl bg-slate-100 py-3 font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/v1/category', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                      });
                      if (res.ok) {
                        setIsAddModalOpen(false);
                        window.location.reload();
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="flex-1 rounded-2xl bg-[#ff242d] py-3 font-semibold text-white hover:bg-[#ea1d26]"
                >
                  Save Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
